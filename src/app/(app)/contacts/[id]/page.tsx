import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityComposer } from "@/components/activity-composer";
import { ActivityTimeline } from "@/components/activity-timeline";
import { PageSpinner } from "@/components/page-spinner";
import { TrashButton } from "@/components/trash-button";
import { Badge, buttonClass, Card, StageBadge } from "@/components/ui";
import { getTimeline } from "@/lib/activities";
import { canEditRole, canTrashRecord, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/crm";
import { contactName, formatDate, formatMoney, initials, personName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { eraseContact, trashContact } from "../actions";

export const metadata: Metadata = { title: "Contact" };

const CONTACT_SELECT = `id, first_name, last_name, email, phone, title, tags, notes, owner_id, created_at, consented_at, consent_text,
  company:companies!contacts_org_id_company_id_fkey(id, name, website),
  owner:profiles!contacts_owner_id_fkey(full_name, email)`;

async function ContactPageContent({ params }: PageProps<"/contacts/[id]">) {
  const ctx = await requireReadyOrg();
  const { org } = ctx;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("id", id)
    .eq("org_id", org.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!contact) notFound();

  const [{ data: leads }, stages, members] = await Promise.all([
    supabase
      .from("leads")
      .select("id, title, value, currency, status, stage_id, created_at")
      .eq("org_id", org.id)
      .eq("contact_id", contact.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    getStages(org.id),
    getMembers(org.id),
  ]);
  const leadList = leads ?? [];
  const timeline = await getTimeline(org.id, { contactId: contact.id, leadIds: leadList.map((l) => l.id) });

  const canEdit = canEditRole(ctx.role);
  const path = `/contacts/${contact.id}`;
  const name = contactName(contact);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const openValue = leadList.filter((l) => l.status === "open").reduce((sum, l) => sum + Number(l.value), 0);
  const wonValue = leadList.filter((l) => l.status === "won").reduce((sum, l) => sum + Number(l.value), 0);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/contacts" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Contacts
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {initials(name)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{name}</h1>
              <p className="truncate text-sm text-zinc-500">{[contact.title, contact.company?.name].filter(Boolean).join(" at ")}</p>
            </div>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={`/leads/new?contact=${contact.id}`} className={buttonClass("primary")}>
                New lead
              </Link>
              <Link href={`/contacts/${contact.id}/edit`} className={buttonClass("secondary")}>
                Edit
              </Link>
              {canTrashRecord(ctx, contact.owner_id) ? (
                <TrashButton action={trashContact.bind(null, contact.id)} confirmText={`Delete ${name}? Their leads are kept.`} />
              ) : null}
              {isAdminRole(ctx.role) ? (
                <TrashButton
                  action={eraseContact.bind(null, contact.id)}
                  label="Erase…"
                  confirmText={`Permanently erase ${name}, their ${leadList.length} lead${leadList.length === 1 ? "" : "s"} and all activity, including history in the audit log? This can't be undone. Use it for data deletion (GDPR) requests.`}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="order-2 space-y-8 lg:order-1">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Leads</h2>
              {leadList.length ? (
                <span className="text-xs text-zinc-500">
                  {formatMoney(openValue, org.currency)} open · {formatMoney(wonValue, org.currency)} won
                </span>
              ) : null}
            </div>
            {leadList.length ? (
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
                {leadList.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{lead.title}</span>
                      <StageBadge stage={stageById.get(lead.stage_id) ?? null} />
                      <span className="w-24 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                        {formatMoney(lead.value, lead.currency ?? org.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No leads with {name} yet.</p>
            )}
          </section>

          {canEdit ? <ActivityComposer contactId={contact.id} path={path} members={members} currentUserId={ctx.user.id} /> : null}
          <ActivityTimeline
            items={timeline}
            stageNames={new Map(stages.map((s) => [s.id, s.name]))}
            org={org}
            viewer={{ userId: ctx.user.id, isAdmin: isAdminRole(ctx.role), canEdit }}
            path={path}
            showLead
          />
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="space-y-2.5 text-sm">
              <Detail label="Email">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="hover:underline">
                    {contact.email}
                  </a>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Phone">
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="hover:underline">
                    {contact.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Company">
                {contact.company ? (
                  contact.company.website && /^https?:\/\//i.test(contact.company.website) ? (
                    <a href={contact.company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {contact.company.name}
                    </a>
                  ) : (
                    contact.company.name
                  )
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Owner">{personName(contact.owner) || "Unassigned"}</Detail>
              {contact.tags.length ? (
                <Detail label="Tags">
                  <span className="flex flex-wrap gap-1">
                    {contact.tags.map((t) => (
                      <Link key={t} href={`/contacts?tag=${encodeURIComponent(t)}`}>
                        <Badge>{t}</Badge>
                      </Link>
                    ))}
                  </span>
                </Detail>
              ) : null}
              <Detail label="Added">{formatDate(contact.created_at, org)}</Detail>
              {contact.consented_at ? (
                <Detail label="Consent">
                  <span title={contact.consent_text ?? undefined}>{formatDate(contact.consented_at, org)}</span>
                </Detail>
              ) : null}
            </dl>
          </Card>
          {contact.notes ? (
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-medium">Notes</h2>
              <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{contact.notes}</p>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ContactPage(props: PageProps<"/contacts/[id]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ContactPageContent {...props} />
    </Suspense>
  );
}

import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityComposer } from "@/components/activity-composer";
import { ActivityTimeline } from "@/components/activity-timeline";
import { PageSpinner } from "@/components/page-spinner";
import { TrashButton } from "@/components/trash-button";
import { Badge, buttonClass, Card } from "@/components/ui";
import { getTimeline } from "@/lib/activities";
import { canEditRole, canTrashRecord, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/crm";
import { contactName, formatDate, formatDay, formatMoney, personName, todayIn } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { trashLead } from "../actions";
import { StageControl } from "./stage-control";

export const metadata: Metadata = { title: "Lead" };

const LEAD_SELECT = `id, title, value, currency, status, stage_id, expected_close_date, lost_reason, closed_at, created_at, owner_id, tags,
  contact:contacts!leads_org_id_contact_id_fkey(id, first_name, last_name, email, phone, title),
  company:companies!leads_org_id_company_id_fkey(id, name, website),
  source:lead_sources!leads_org_id_source_id_fkey(name),
  owner:profiles!leads_owner_id_fkey(full_name, email),
  creator:profiles!leads_created_by_fkey(full_name, email)`;

async function LeadPageContent({ params }: PageProps<"/leads/[id]">) {
  const ctx = await requireReadyOrg();
  const { org } = ctx;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select(LEAD_SELECT).eq("id", id).eq("org_id", org.id).is("deleted_at", null).maybeSingle();
  if (!lead) notFound();

  const [stages, members, timeline] = await Promise.all([getStages(org.id), getMembers(org.id), getTimeline(org.id, { leadIds: [lead.id] })]);
  const canEdit = canEditRole(ctx.role);
  const path = `/leads/${lead.id}`;
  const overdue = lead.status === "open" && lead.expected_close_date && lead.expected_close_date < todayIn(org.timezone);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Pipeline
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words text-zinc-900 dark:text-zinc-100">{lead.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatMoney(lead.value, lead.currency ?? org.currency)}
              </span>
              {lead.status === "won" ? <Badge tone="won">Won</Badge> : null}
              {lead.status === "lost" ? <Badge tone="lost">Lost</Badge> : null}
              {lead.contact ? (
                <>
                  <span aria-hidden>·</span>
                  <Link href={`/contacts/${lead.contact.id}`} className="hover:underline">
                    {contactName(lead.contact)}
                  </Link>
                </>
              ) : null}
              {lead.company ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{lead.company.name}</span>
                </>
              ) : null}
            </p>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={`/leads/${lead.id}/edit`} className={buttonClass("secondary")}>
                Edit
              </Link>
              {canTrashRecord(ctx, lead.owner_id) ? (
                <TrashButton action={trashLead.bind(null, lead.id)} confirmText={`Delete “${lead.title}”?`} />
              ) : null}
            </div>
          ) : null}
        </div>
        <StageControl leadId={lead.id} leadTitle={lead.title} stageId={lead.stage_id} stages={stages} canEdit={canEdit} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="order-2 space-y-6 lg:order-1">
          {canEdit ? <ActivityComposer leadId={lead.id} contactId={lead.contact?.id} path={path} members={members} currentUserId={ctx.user.id} /> : null}
          <ActivityTimeline
            items={timeline}
            stageNames={new Map(stages.map((s) => [s.id, s.name]))}
            org={org}
            viewer={{ userId: ctx.user.id, isAdmin: isAdminRole(ctx.role), canEdit }}
            path={path}
          />
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="space-y-2.5 text-sm">
              <Detail label="Owner">{personName(lead.owner) || "Unassigned"}</Detail>
              <Detail label="Source">{lead.source?.name ?? "—"}</Detail>
              <Detail label="Expected close">
                {lead.expected_close_date ? (
                  <span className={overdue ? "text-amber-700 dark:text-amber-400" : undefined}>
                    {formatDay(lead.expected_close_date, org)}
                    {overdue ? " (overdue)" : ""}
                  </span>
                ) : (
                  "—"
                )}
              </Detail>
              {lead.closed_at ? <Detail label="Closed">{formatDate(lead.closed_at, org)}</Detail> : null}
              {lead.status === "lost" ? <Detail label="Lost reason">{lead.lost_reason || "—"}</Detail> : null}
              <Detail label="Created">
                {formatDate(lead.created_at, org)}
                {lead.creator ? ` by ${personName(lead.creator)}` : ""}
              </Detail>
            </dl>
          </Card>

          {lead.contact ? (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-medium">Contact</h2>
              <Link href={`/contacts/${lead.contact.id}`} className="font-medium hover:underline">
                {contactName(lead.contact)}
              </Link>
              {lead.contact.title ? <p className="text-sm text-zinc-500">{lead.contact.title}</p> : null}
              <div className="mt-2 space-y-1 text-sm">
                {lead.contact.email ? (
                  <a href={`mailto:${lead.contact.email}`} className="block truncate text-zinc-600 hover:underline dark:text-zinc-400">
                    {lead.contact.email}
                  </a>
                ) : null}
                {lead.contact.phone ? (
                  <a href={`tel:${lead.contact.phone}`} className="block text-zinc-600 hover:underline dark:text-zinc-400">
                    {lead.contact.phone}
                  </a>
                ) : null}
              </div>
            </Card>
          ) : canEdit ? (
            <Card className="p-4 text-sm text-zinc-500">
              No contact yet.{" "}
              <Link href={`/leads/${lead.id}/edit`} className="text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100">
                Add one
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function LeadPage(props: PageProps<"/leads/[id]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LeadPageContent {...props} />
    </Suspense>
  );
}

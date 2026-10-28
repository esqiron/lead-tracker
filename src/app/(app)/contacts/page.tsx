import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageSpinner } from "@/components/page-spinner";
import { Badge, buttonClass, EmptyState, PageHeader } from "@/components/ui";
import { ParamSelect, SearchInput } from "@/components/url-filters";
import { canEditRole, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers } from "@/lib/crm";
import { param } from "@/lib/forms";
import { applyContactFilters, queryString, readContactFilters } from "@/lib/list-filters";
import { contactName, formatDate, personName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contacts" };

const PAGE_SIZE = 50;

const CONTACT_SELECT = `id, first_name, last_name, email, phone, title, tags, created_at, do_not_contact_at,
  company:companies!contacts_org_id_company_id_fkey(name),
  owner:profiles!contacts_owner_id_fkey(full_name, email)`;

type Search = Record<string, string | string[] | undefined>;

function hrefWith(sp: Search, changes: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) if (typeof value === "string" && value) params.set(key, value);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  return qs ? `/contacts?${qs}` : "/contacts";
}

async function ContactsPageContent({ searchParams }: PageProps<"/contacts">) {
  const ctx = await requireReadyOrg();
  const { org, user } = ctx;
  const sp = await searchParams;
  const filters = readContactFilters(sp);
  const { tag } = filters;
  const page = Math.max(1, Number(param(sp.page)) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select(CONTACT_SELECT, { count: "exact" })
    .eq("org_id", org.id)
    .is("deleted_at", null);
  query = applyContactFilters(query, filters, user.id);

  const [{ data, count, error }, members] = await Promise.all([
    query
      .order("first_name", { nullsFirst: false })
      .order("last_name", { nullsFirst: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    getMembers(org.id),
  ]);
  if (error) throw new Error(error.message);
  const contacts = data ?? [];

  // Open lead counts for the contacts on this page.
  const { data: openLeads } = contacts.length
    ? await supabase
        .from("leads")
        .select("contact_id")
        .eq("org_id", org.id)
        .eq("status", "open")
        .is("deleted_at", null)
        .in("contact_id", contacts.map((c) => c.id))
    : { data: [] };
  const openCount = new Map<string, number>();
  for (const l of openLeads ?? []) if (l.contact_id) openCount.set(l.contact_id, (openCount.get(l.contact_id) ?? 0) + 1);

  const canEdit = canEditRole(ctx.role);
  const filtered = Boolean(filters.q || filters.owner || filters.tag);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={`${count ?? 0} contact${count === 1 ? "" : "s"}${filtered ? (count === 1 ? " matches your filters" : " match your filters") : ""}`}
        actions={
          <>
            {isAdminRole(ctx.role) && count ? (
              <a href={`/contacts/export?${queryString({ ...sp, page: undefined })}`} download className={buttonClass("secondary")}>
                Export CSV
              </a>
            ) : null}
            {isAdminRole(ctx.role) ? (
              <Link href="/contacts/import" className={buttonClass("secondary")}>
                Import CSV
              </Link>
            ) : null}
            {canEdit ? (
              <Link href="/contacts/new" className={buttonClass("primary")}>
                New contact
              </Link>
            ) : null}
          </>
        }
      />

      {!contacts.length && !filtered ? (
        <EmptyState
          title="No contacts yet"
          description="Contacts are the people you sell to. They're also created when you add a lead with a new contact."
          action={
            canEdit ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/contacts/new" className={buttonClass("primary")}>
                  New contact
                </Link>
                {isAdminRole(ctx.role) ? (
                  <Link href="/contacts/import" className={buttonClass("secondary")}>
                    Import CSV
                  </Link>
                ) : null}
              </div>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput placeholder="Search name or email" />
            <ParamSelect
              name="owner"
              label="Owner"
              allLabel="Any owner"
              options={[{ value: "me", label: "Mine" }, ...members.map((m) => ({ value: m.id, label: m.name })), { value: "none", label: "Unassigned" }]}
            />
            {tag ? (
              <Link href={hrefWith(sp, { tag: undefined, page: undefined })} className={buttonClass("secondary", "h-9")}>
                Tag: {tag} ×
              </Link>
            ) : null}
          </div>

          {contacts.length ? (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Name</th>
                    <th scope="col" className="px-3 py-2 font-medium">Email</th>
                    <th scope="col" className="px-3 py-2 font-medium">Phone</th>
                    <th scope="col" className="px-3 py-2 font-medium">Company</th>
                    <th scope="col" className="px-3 py-2 font-medium">Owner</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Open leads</th>
                    <th scope="col" className="px-3 py-2 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="max-w-64 px-3 py-2.5">
                        <Link href={`/contacts/${contact.id}`} className="block truncate font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                          {contactName(contact)}
                        </Link>
                        {contact.title || contact.tags.length || contact.do_not_contact_at ? (
                          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                            {contact.do_not_contact_at ? <Badge tone="warning">Do not contact</Badge> : null}
                            {contact.title}
                            {contact.tags.map((t) => (
                              <Link key={t} href={hrefWith(sp, { tag: t, page: undefined })}>
                                <Badge>{t}</Badge>
                              </Link>
                            ))}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-56 truncate px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{contact.email}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{contact.phone}</td>
                      <td className="max-w-48 truncate px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{contact.company?.name}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{personName(contact.owner)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{openCount.get(contact.id) ?? 0}</td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-600 dark:text-zinc-400">{formatDate(contact.created_at, org)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No contacts match" description="Try a different search or clear some filters." />
          )}

          {pages > 1 ? (
            <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
              <span className="text-zinc-500">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={hrefWith(sp, { page: page - 1 > 1 ? String(page - 1) : undefined })} className={buttonClass("secondary", "h-9")}>
                    Previous
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link href={hrefWith(sp, { page: String(page + 1) })} className={buttonClass("secondary", "h-9")}>
                    Next
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ContactsPage(props: PageProps<"/contacts">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ContactsPageContent {...props} />
    </Suspense>
  );
}

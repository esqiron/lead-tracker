import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageSpinner } from "@/components/page-spinner";
import { buttonClass, cx, EmptyState, PageHeader, StageBadge } from "@/components/ui";
import { ParamSelect, SearchInput } from "@/components/url-filters";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getSources, getStages } from "@/lib/crm";
import { cleanSearch, param } from "@/lib/forms";
import { contactName, formatDate, formatDay, formatMoney, personName, todayIn } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { LeadBoard, type BoardCard } from "./lead-board";

export const metadata: Metadata = { title: "Leads" };

const PAGE_SIZE = 50;
const BOARD_LIMIT = 500;

// One literal string so supabase-js can infer the row type.
const LIST_SELECT = `id, title, value, currency, status, stage_id, expected_close_date, created_at, owner_id,
  contact:contacts!leads_org_id_contact_id_fkey(first_name, last_name, email),
  company:companies!leads_org_id_company_id_fkey(name),
  source:lead_sources!leads_org_id_source_id_fkey(name),
  owner:profiles!leads_owner_id_fkey(full_name, email)`;

const SORTS = {
  created: "created_at",
  value: "value",
  close: "expected_close_date",
  title: "title",
} as const;
type SortKey = keyof typeof SORTS;

type Search = Record<string, string | string[] | undefined>;

function hrefWith(sp: Search, changes: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) if (typeof value === "string" && value) params.set(key, value);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

async function LeadsPageContent({ searchParams }: PageProps<"/leads">) {
  const ctx = await requireReadyOrg();
  const { org, user } = ctx;
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "board";
  const q = cleanSearch(sp.q);
  const owner = param(sp.owner);
  const source = param(sp.source);
  const status = param(sp.status);
  const sort: SortKey = (param(sp.sort) as SortKey) in SORTS ? (param(sp.sort) as SortKey) : "created";
  const ascending = sp.dir === "asc";
  const page = Math.max(1, Number(param(sp.page)) || 1);

  const supabase = await createClient();
  const [stages, sources, members] = await Promise.all([getStages(org.id), getSources(org.id), getMembers(org.id)]);

  let query = supabase
    .from("leads")
    .select(LIST_SELECT, { count: "exact" })
    .eq("org_id", org.id)
    .is("deleted_at", null);
  if (q) query = query.ilike("title", `%${q}%`);
  if (owner === "me") query = query.eq("owner_id", user.id);
  else if (owner === "none") query = query.is("owner_id", null);
  else if (owner) query = query.eq("owner_id", owner);
  if (source) query = query.eq("source_id", source);

  if (view === "table") {
    if (status === "open" || status === "won" || status === "lost") query = query.eq("status", status);
    query = query
      .order(SORTS[sort], { ascending, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  } else {
    query = query.order("created_at", { ascending: false }).limit(BOARD_LIMIT);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const leads = data ?? [];
  const canEdit = canEditRole(ctx.role);
  const filtered = Boolean(q || owner || source || status);
  const today = todayIn(org.timezone);

  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700" role="group" aria-label="View">
        {(["board", "table"] as const).map((v) => (
          <Link
            key={v}
            href={hrefWith(sp, { view: v === "board" ? undefined : v, page: undefined, status: undefined })}
            aria-current={view === v ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-1 text-sm capitalize",
              view === v ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400",
            )}
          >
            {v}
          </Link>
        ))}
      </div>
      <SearchInput placeholder="Search leads" />
      <ParamSelect
        name="owner"
        label="Owner"
        allLabel="Any owner"
        options={[{ value: "me", label: "Mine" }, ...members.map((m) => ({ value: m.id, label: m.name })), { value: "none", label: "Unassigned" }]}
      />
      <ParamSelect name="source" label="Source" allLabel="Any source" options={sources.map((s) => ({ value: s.id, label: s.name }))} />
      {view === "table" ? (
        <ParamSelect
          name="status"
          label="Status"
          allLabel="Any status"
          options={[
            { value: "open", label: "Open" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ]}
        />
      ) : null}
    </div>
  );

  const header = (
    <PageHeader
      title="Leads"
      description={`${count ?? 0} lead${count === 1 ? "" : "s"}${filtered ? (count === 1 ? " matches your filters" : " match your filters") : ""}`}
      actions={
        canEdit ? (
          <Link href="/leads/new" className={buttonClass("primary")}>
            New lead
          </Link>
        ) : null
      }
    />
  );

  if (!leads.length && !filtered) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          title="No leads yet"
          description="Add your first lead to start tracking it through your pipeline."
          action={
            canEdit ? (
              <Link href="/leads/new" className={buttonClass("primary")}>
                New lead
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (view === "board") {
    const cards: BoardCard[] = leads.map((lead) => ({
      id: lead.id,
      title: lead.title,
      amount: Number(lead.value),
      stageId: lead.stage_id,
      subtitle: [contactName(lead.contact), lead.company?.name].filter(Boolean).join(" · "),
      ownerName: personName(lead.owner),
      closeDate: formatDay(lead.expected_close_date, org),
      overdue: lead.status === "open" && Boolean(lead.expected_close_date && lead.expected_close_date < today),
    }));
    return (
      <div className="space-y-6">
        {header}
        {toolbar}
        {count && count > BOARD_LIMIT ? (
          <p className="text-sm text-zinc-500">Showing the {BOARD_LIMIT} newest leads. Use filters or the table to see the rest.</p>
        ) : null}
        <LeadBoard stages={stages} cards={cards} currency={org.currency} canEdit={canEdit} />
      </div>
    );
  }

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const sortHeader = (key: SortKey, label: string, align?: "right") => {
    const active = sort === key;
    const nextDir = active && !ascending ? "asc" : undefined;
    return (
      <th scope="col" className={cx("px-3 py-2 font-medium", align === "right" && "text-right")} aria-sort={active ? (ascending ? "ascending" : "descending") : undefined}>
        <Link href={hrefWith(sp, { sort: key === "created" ? undefined : key, dir: nextDir, page: undefined })} className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
          {label}
          {active ? <span aria-hidden>{ascending ? "↑" : "↓"}</span> : null}
        </Link>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {header}
      {toolbar}
      {leads.length ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <tr>
                {sortHeader("title", "Lead")}
                <th scope="col" className="px-3 py-2 font-medium">Contact</th>
                <th scope="col" className="px-3 py-2 font-medium">Stage</th>
                {sortHeader("value", "Value", "right")}
                <th scope="col" className="px-3 py-2 font-medium">Owner</th>
                <th scope="col" className="px-3 py-2 font-medium">Source</th>
                {sortHeader("close", "Expected close")}
                {sortHeader("created", "Created")}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="max-w-72 px-3 py-2.5">
                    <Link href={`/leads/${lead.id}`} className="block truncate font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                      {lead.title}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {[contactName(lead.contact), lead.company?.name].filter(Boolean).join(" · ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <StageBadge stage={stageById.get(lead.stage_id) ?? null} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(lead.value, lead.currency ?? org.currency)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{personName(lead.owner)}</td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{lead.source?.name}</td>
                  <td
                    className={cx(
                      "px-3 py-2.5 tabular-nums",
                      lead.status === "open" && lead.expected_close_date && lead.expected_close_date < today
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-zinc-600 dark:text-zinc-400",
                    )}
                  >
                    {formatDay(lead.expected_close_date, org)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-600 dark:text-zinc-400">{formatDate(lead.created_at, org)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No leads match" description="Try a different search or clear some filters." />
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
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function LeadsPage(props: PageProps<"/leads">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LeadsPageContent {...props} />
    </Suspense>
  );
}

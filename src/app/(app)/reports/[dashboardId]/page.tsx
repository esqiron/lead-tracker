import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { cx } from "@/components/ui";
import { ParamSelect } from "@/components/url-filters";
import { canEditRole, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getSources } from "@/lib/crm";
import { getDashboard, listDashboards, type WidgetContext } from "@/lib/dashboard-data";
import { widgetTitle } from "@/lib/dashboards";
import { param } from "@/lib/forms";
import { periodLabel, PERIODS, readReportFilters } from "@/lib/reports";
import { CompareToggle } from "../compare-toggle";
import { DashboardEditor } from "../dashboard-editor";
import { PeriodPicker } from "../period-picker";
import { WidgetBoundary } from "../widget-boundary";
import { WidgetSkeleton, WidgetView } from "../widgets";

export const metadata: Metadata = { title: "Reports" };

async function DashboardContent({ params, searchParams }: PageProps<"/reports/[dashboardId]">) {
  const ctx = await requireReadyOrg();
  const { org } = ctx;
  const [{ dashboardId }, sp] = await Promise.all([params, searchParams]);
  const [dashboard, dashboards, members, sources] = await Promise.all([getDashboard(org.id, dashboardId), listDashboards(org.id), getMembers(org.id), getSources(org.id)]);
  if (!dashboard) notFound();

  // URL filters override the dashboard's saved defaults, so any view can be shared as a link.
  const saved = dashboard.filters;
  const hasPeriod = param(sp.period) !== undefined;
  const filters = readReportFilters(
    {
      period: param(sp.period) ?? saved.period,
      from: hasPeriod ? param(sp.from) : saved.from,
      to: hasPeriod ? param(sp.to) : saved.to,
      owner: param(sp.owner) ?? saved.owner,
      source: param(sp.source) ?? saved.source,
    },
    org.timezone,
  );
  const compareParam = param(sp.compare);
  const compare = compareParam === undefined ? (saved.compare ?? true) : compareParam === "1";
  const widgetCtx: WidgetContext = { orgId: org.id, currency: org.currency, filters, compare, canExport: isAdminRole(ctx.role) };
  const shared = dashboard.visibility === "org";
  // Creators edit their own; admins also edit shared ones (same rule as RLS).
  const canEdit = dashboard.saved && (dashboard.createdBy === ctx.user.id || (shared && isAdminRole(ctx.role)));
  const editing = canEdit && param(sp.edit) === "1";

  return (
    <div className="space-y-6">
      {dashboards.length > 1 ? (
        <nav aria-label="Dashboards" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {dashboards.map((d) => (
            <Link
              key={d.id}
              href={`/reports/${d.id}`}
              aria-current={d.id === dashboard.id ? "page" : undefined}
              className={cx(
                "rounded-[10px] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-300 ease-studio",
                d.id === dashboard.id
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-hairline dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
              )}
            >
              {d.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <DashboardEditor
        key={dashboard.id}
        dashboard={{ id: dashboard.id, name: dashboard.name, visibility: dashboard.visibility, template: dashboard.template, saved: dashboard.saved, filters: saved, layout: dashboard.layout }}
        nodes={Object.fromEntries(
          dashboard.layout.map((w) => [
            w.id,
            <WidgetBoundary key={w.id} title={widgetTitle(w)}>
              <Suspense fallback={<WidgetSkeleton w={w} />}>
                <WidgetView w={w} ctx={widgetCtx} />
              </Suspense>
            </WidgetBoundary>,
          ]),
        )}
        editing={editing}
        canEdit={canEdit}
        canShare={canEditRole(ctx.role) && (!dashboard.saved || dashboard.createdBy === ctx.user.id || isAdminRole(ctx.role))}
        description={
          <>
            {periodLabel(filters)} · {shared ? "Shared with the team" : "Only you"}
            {dashboard.saved ? null : " · Built-in dashboard"}
          </>
        }
        filterBar={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <PeriodPicker periods={PERIODS} from={filters.from} to={filters.to} defaultPeriod={saved.period ?? "this_month"} />
            <ParamSelect name="owner" label="Owner" allLabel="Everyone" defaultValue={saved.owner} options={members.map((m) => ({ value: m.id, label: m.name }))} />
            <ParamSelect name="source" label="Source" allLabel="All sources" defaultValue={saved.source} options={sources.map((s) => ({ value: s.id, label: s.name }))} />
            <CompareToggle defaultOn={saved.compare ?? true} />
          </div>
        }
        deleted={param(sp.deleted) ?? null}
        currency={org.currency}
      />
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function DashboardPage(props: PageProps<"/reports/[dashboardId]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardContent {...props} />
    </Suspense>
  );
}

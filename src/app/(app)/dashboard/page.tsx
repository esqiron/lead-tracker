import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass, Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { isAdminRole, requireReadyOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clearSampleData } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

async function DashboardPageContent() {
  const { org, role } = await requireReadyOrg();
  const supabase = await createClient();

  const [{ data: leads }, { data: stages }, { count: memberCount }] = await Promise.all([
    supabase.from("leads").select("value, status, stage_id, closed_at, created_at, tags").eq("org_id", org.id).is("deleted_at", null),
    supabase.from("pipeline_stages").select("id, name, probability, is_won, is_lost").eq("org_id", org.id).order("position"),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "active"),
  ]);

  const all = leads ?? [];
  const probability = new Map(stages?.map((s) => [s.id, s.probability]));
  const open = all.filter((l) => l.status === "open");
  const won = all.filter((l) => l.status === "won");
  const closed = all.filter((l) => l.status !== "open");
  const openValue = open.reduce((sum, l) => sum + Number(l.value), 0);
  const weighted = open.reduce((sum, l) => sum + Number(l.value) * ((probability.get(l.stage_id) ?? 0) / 100), 0);
  const wonValue = won.reduce((sum, l) => sum + Number(l.value), 0);
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : null;
  const hasSample = all.some((l) => l.tags.includes("sample"));

  const money = new Intl.NumberFormat(undefined, { style: "currency", currency: org.currency, maximumFractionDigits: 0 });

  const kpis = [
    { label: "Open pipeline", value: money.format(openValue), detail: `${open.length} open lead${open.length === 1 ? "" : "s"}` },
    { label: "Weighted pipeline", value: money.format(weighted), detail: "Value × stage win chance" },
    { label: "Won", value: money.format(wonValue), detail: `${won.length} lead${won.length === 1 ? "" : "s"}` },
    { label: "Win rate", value: winRate === null ? "—" : `${winRate}%`, detail: `${closed.length} closed` },
  ];

  const byStage = (stages ?? []).map((stage) => {
    const inStage = all.filter((l) => l.stage_id === stage.id);
    return { ...stage, count: inStage.length, value: inStage.reduce((sum, l) => sum + Number(l.value), 0) };
  });
  const maxStageValue = Math.max(1, ...byStage.map((s) => s.value));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {memberCount ?? 1} member{memberCount === 1 ? "" : "s"} · you&apos;re {role === "admin" || role === "owner" ? "an" : "a"} {role}
        </p>
      </div>

      {hasSample && isAdminRole(role) ? (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">You&apos;re looking at sample data. Clear it when you&apos;re ready to add your own.</p>
          <form action={clearSampleData}>
            <SubmitButton variant="secondary" pendingLabel="Clearing…">
              Clear sample data
            </SubmitButton>
          </form>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-sm text-zinc-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{kpi.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{kpi.detail}</p>
          </Card>
        ))}
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Pipeline by stage</h2>
          <span className="flex gap-4">
            <Link href="/reports" className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
              Full reports
            </Link>
            <Link href="/leads" className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
              Open board
            </Link>
          </span>
        </div>
        {all.length ? (
          <ul className="mt-4 space-y-3">
            {byStage.map((stage) => (
              <li key={stage.id} className="grid grid-cols-[8rem_1fr_7rem] items-center gap-3 text-sm">
                <span className="truncate">{stage.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span
                    className={stage.is_won ? "block h-full bg-emerald-500" : stage.is_lost ? "block h-full bg-zinc-400" : "block h-full bg-zinc-900 dark:bg-zinc-100"}
                    style={{ width: `${(stage.value / maxStageValue) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {stage.count} · {money.format(stage.value)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-zinc-500">No leads yet.</p>
            <Link href="/leads/new" className={buttonClass("secondary", "h-9")}>
              Add your first lead
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardPageContent />
    </Suspense>
  );
}

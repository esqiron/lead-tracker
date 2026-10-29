import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageSpinner } from "@/components/page-spinner";
import { cx } from "@/components/ui";
import { requireSettingsAdmin } from "@/lib/auth";
import { getMembers } from "@/lib/crm";
import { todayIn } from "@/lib/format";
import { param } from "@/lib/forms";
import { addQuarters, isQuarterStart, quarterLabel, quarterStart } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";
import { SettingsSection } from "../settings-section";
import { GoalsForm } from "./goals-form";

export const metadata: Metadata = { title: "Goal settings" };

async function GoalsSettingsContent({ searchParams }: PageProps<"/settings/goals">) {
  const { org } = await requireSettingsAdmin();
  const sp = await searchParams;
  const current = quarterStart(todayIn(org.timezone));
  const requested = param(sp.quarter);
  const quarter = isQuarterStart(requested) ? requested : current;
  const supabase = await createClient();
  const [members, { data: goals }] = await Promise.all([
    getMembers(org.id),
    supabase.from("goals").select("user_id, amount").eq("org_id", org.id).eq("period_start", quarter),
  ]);
  const amount = (userId: string | null) => {
    const g = goals?.find((x) => x.user_id === userId);
    return g ? String(Number(g.amount)) : "";
  };
  const quarters = [-1, 0, 1, 2].map((n) => addQuarters(current, n));

  return (
    <SettingsSection
      title="Goals"
      description="Won value to aim for each quarter. Dashboards show progress, the pace you need and the forecast against these. Everyone in the organization can see them."
    >
      <nav aria-label="Quarter" className="mb-5 flex flex-wrap gap-1">
        {quarters.map((q) => (
          <Link
            key={q}
            href={q === current ? "/settings/goals" : `/settings/goals?quarter=${q}`}
            aria-current={q === quarter ? "page" : undefined}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              q === quarter ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {quarterLabel(q)}
            {q === current ? " (now)" : ""}
          </Link>
        ))}
      </nav>
      <GoalsForm
        key={quarter}
        quarter={quarter}
        quarterName={quarterLabel(quarter)}
        currency={org.currency}
        team={amount(null)}
        members={members.map((m) => ({ id: m.id, name: m.name, amount: amount(m.id) }))}
      />
    </SettingsSection>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function GoalsSettingsPage(props: PageProps<"/settings/goals">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <GoalsSettingsContent {...props} />
    </Suspense>
  );
}

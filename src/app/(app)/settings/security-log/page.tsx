import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageSpinner } from "@/components/page-spinner";
import { cx, EmptyState } from "@/components/ui";
import { requireSettingsAdmin } from "@/lib/auth";
import { formatDateTime, personName } from "@/lib/format";
import { param } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { SettingsSection } from "../settings-section";

export const metadata: Metadata = { title: "Security log" };

const SECURITY_ENTITIES = ["memberships", "invitations", "api_keys", "capture_forms", "organizations", "pipeline_stages", "lead_sources", "profiles", "report"];
const SECURITY_ACTIONS = ["export", "import", "erase", "password_reset", "retention"];

const ENTITY_LABELS: Record<string, string> = {
  memberships: "Member",
  invitations: "Invitation",
  api_keys: "API key",
  capture_forms: "Capture form",
  organizations: "Organization",
  pipeline_stages: "Pipeline stage",
  lead_sources: "Lead source",
  profiles: "Account",
  report: "Report",
  leads: "Lead",
  contacts: "Contact",
  companies: "Company",
};
const ACTION_LABELS: Record<string, string> = {
  insert: "created",
  update: "changed",
  delete: "deleted",
  export: "exported",
  import: "imported",
  erase: "erased",
  password_reset: "password reset sent",
  retention: "retention applied",
};

// Short, readable summary of what changed, without dumping whole rows.
function summary(entity: string, action: string, diff: unknown): string {
  if (!diff || typeof diff !== "object") return "";
  const d = diff as Record<string, unknown>;
  if (action === "update" && d.new && typeof d.new === "object") {
    const next = d.new as Record<string, unknown>;
    const prev = (d.old ?? {}) as Record<string, unknown>;
    return Object.keys(next)
      .slice(0, 4)
      .map((k) => `${k.replace(/_/g, " ")}: ${short(prev[k])} → ${short(next[k])}`)
      .join(" · ");
  }
  if (entity === "invitations" || entity === "memberships") return [d.email, d.role].filter(Boolean).map(String).join(" · ");
  if (entity === "api_keys" || entity === "capture_forms" || entity === "pipeline_stages" || entity === "lead_sources") return String(d.name ?? "");
  if (action === "export" || action === "import" || action === "retention") return Object.entries(d).filter(([k]) => k !== "filters").map(([k, v]) => `${k}: ${short(v)}`).join(" · ");
  return "";
}

function short(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

async function SecurityLogContent({ searchParams }: PageProps<"/settings/security-log">) {
  const { org } = await requireSettingsAdmin();
  const sp = await searchParams;
  const all = param(sp.show) === "all";
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, diff, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, email)")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (!all) query = query.or(`entity.in.(${SECURITY_ENTITIES.join(",")}),action.in.(${SECURITY_ACTIONS.join(",")})`);
  const { data: events } = await query;

  return (
    <SettingsSection
      title="Security log"
      description="Who changed access, settings and keys, and who exported, imported or erased data. The newest 300 entries."
    >
      <div className="mb-4 flex gap-1 text-sm">
        {[
          { href: "/settings/security-log", label: "Security events", on: !all },
          { href: "/settings/security-log?show=all", label: "Everything", on: all },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cx("rounded-md px-3 py-1.5", t.on ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {events?.length ? (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white text-sm dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {events.map((e) => (
            <li key={e.id} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[9.5rem_1fr]">
              <span className="text-xs tabular-nums text-zinc-500">{formatDateTime(e.created_at, org)}</span>
              <span className="min-w-0">
                <span className="font-medium">{personName(e.actor) || "System"}</span>{" "}
                <span className="text-zinc-600 dark:text-zinc-400">
                  {ACTION_LABELS[e.action] ?? e.action} · {ENTITY_LABELS[e.entity] ?? e.entity}
                </span>
                {summary(e.entity, e.action, e.diff) ? (
                  <span className="block truncate text-xs text-zinc-500">{summary(e.entity, e.action, e.diff)}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing logged yet" />
      )}
    </SettingsSection>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function SecurityLogPage(props: PageProps<"/settings/security-log">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SecurityLogContent {...props} />
    </Suspense>
  );
}

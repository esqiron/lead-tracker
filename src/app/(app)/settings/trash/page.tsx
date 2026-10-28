import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { Button, EmptyState } from "@/components/ui";
import { requireSettingsAdmin } from "@/lib/auth";
import { contactName, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SettingsSection } from "../settings-section";
import { deleteForever, restoreRecord } from "./actions";

export const metadata: Metadata = { title: "Trash" };

type Item = { table: "leads" | "contacts" | "companies"; id: string; label: string; kind: string; deletedAt: string };

async function TrashContent() {
  const { org } = await requireSettingsAdmin();
  const supabase = await createClient();
  const [leads, contacts, companies] = await Promise.all([
    supabase.from("leads").select("id, title, deleted_at").eq("org_id", org.id).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(200),
    supabase.from("contacts").select("id, first_name, last_name, email, deleted_at").eq("org_id", org.id).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(200),
    supabase.from("companies").select("id, name, deleted_at").eq("org_id", org.id).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(200),
  ]);

  const items: Item[] = [
    ...(leads.data ?? []).map((l) => ({ table: "leads" as const, id: l.id, label: l.title, kind: "Lead", deletedAt: l.deleted_at! })),
    ...(contacts.data ?? []).map((c) => ({ table: "contacts" as const, id: c.id, label: contactName(c), kind: "Contact", deletedAt: c.deleted_at! })),
    ...(companies.data ?? []).map((c) => ({ table: "companies" as const, id: c.id, label: c.name, kind: "Company", deletedAt: c.deleted_at! })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  return (
    <SettingsSection
      title="Trash"
      description="Deleted leads, contacts and companies stay here for 30 days, then they're removed for good. Deleting a contact forever also erases their leads, activity and audit history."
    >
      {items.length ? (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {items.map((item) => (
            <li key={`${item.table}-${item.id}`} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="text-xs text-zinc-500">
                  {item.kind} · deleted {formatDate(item.deletedAt, org)}
                </p>
              </div>
              <div className="flex gap-1">
                <form action={restoreRecord}>
                  <input type="hidden" name="table" value={item.table} />
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
                    Restore
                  </Button>
                </form>
                <form action={deleteForever}>
                  <input type="hidden" name="table" value={item.table} />
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="danger" className="h-8 px-2 text-xs">
                    Delete forever
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Trash is empty" />
      )}
    </SettingsSection>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function TrashPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <TrashContent />
    </Suspense>
  );
}

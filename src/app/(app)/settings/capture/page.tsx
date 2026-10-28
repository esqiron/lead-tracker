import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageSpinner } from "@/components/page-spinner";
import { Badge, Button, buttonClass, EmptyState } from "@/components/ui";
import { requireSettingsAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SettingsSection } from "../settings-section";
import { revokeApiKey } from "./actions";
import { ApiKeyForm } from "./api-key-form";

export const metadata: Metadata = { title: "Lead capture" };

async function CaptureSettingsContent() {
  const { org } = await requireSettingsAdmin();
  const supabase = await createClient();
  const [{ data: forms }, { data: keys }] = await Promise.all([
    supabase.from("capture_forms").select("id, name, public_id, is_active, created_at").eq("org_id", org.id).order("created_at"),
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false }),
  ]);
  const activeKeys = (keys ?? []).filter((k) => !k.revoked_at);

  return (
    <div className="space-y-12">
      <SettingsSection
        title="Forms"
        description="Hosted forms you can link to or embed on your website. Every submission becomes a lead and a contact."
      >
        {forms?.length ? (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
            {forms.map((form) => (
              <li key={form.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/settings/capture/forms/${form.id}`} className="font-medium hover:underline">
                    {form.name}
                  </Link>
                  {form.is_active ? null : (
                    <span className="ml-2">
                      <Badge tone="warning">Off</Badge>
                    </span>
                  )}
                  <p className="truncate text-xs text-zinc-500">
                    {env.siteUrl}/f/{form.public_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  {form.is_active ? (
                    <a href={`/f/${form.public_id}`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "h-8 px-2 text-xs")}>
                      Open
                    </a>
                  ) : null}
                  <Link href={`/settings/capture/forms/${form.id}`} className={buttonClass("secondary", "h-8 px-3 text-xs")}>
                    Edit &amp; embed
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No forms yet" description="Create a contact form for your website in a minute." />
        )}
        <div className="mt-4">
          <Link href="/settings/capture/forms/new" className={buttonClass("primary")}>
            New form
          </Link>
        </div>
      </SettingsSection>

      <SettingsSection
        title="API keys"
        description="For sending leads from your own backend or tools like Zapier, Make and n8n. Keep keys secret: anyone with a key can add leads."
      >
        <div className="space-y-6">
          <ApiKeyForm />
          {keys?.length ? (
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {key.name} <span className="font-mono text-xs font-normal text-zinc-500">{key.key_prefix}…</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Created {formatDate(key.created_at, org)} ·{" "}
                      {key.revoked_at ? `revoked ${formatDate(key.revoked_at, org)}` : key.last_used_at ? `last used ${formatDateTime(key.last_used_at, org)}` : "never used"}
                    </p>
                  </div>
                  {key.revoked_at ? (
                    <Badge>Revoked</Badge>
                  ) : (
                    <form action={revokeApiKey}>
                      <input type="hidden" name="id" value={key.id} />
                      <Button type="submit" variant="danger" className="h-8 px-2 text-xs">
                        Revoke
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <div>
            <h3 className="mb-2 text-sm font-medium">Example</h3>
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
              {`curl -X POST ${env.siteUrl}/api/v1/leads \\
  -H "Authorization: Bearer ${activeKeys.length ? `${activeKeys[0]!.key_prefix}…` : "lt_your_key"}" \\
  -H "Content-Type: application/json" \\
  -d '{"first_name":"Ana","last_name":"Popescu","email":"ana@example.com",
       "company":"Northwind","message":"Interested in a demo",
       "lead_title":"Demo request","value":5000,"source":"Website"}'`}
            </pre>
            <p className="mt-2 text-sm text-zinc-500">All fields and responses are in docs/lead-capture.md.</p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function CaptureSettingsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CaptureSettingsContent />
    </Suspense>
  );
}

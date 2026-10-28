import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { TrashButton } from "@/components/trash-button";
import { requireSettingsAdmin } from "@/lib/auth";
import { readFields } from "@/lib/capture-fields";
import { getMembers, getSources, getStages } from "@/lib/crm";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { deleteCaptureForm, saveCaptureForm } from "../../actions";
import { SettingsSection } from "../../../settings-section";
import { EmbedCode } from "../embed-code";
import { CaptureFormEditor } from "../form-editor";

export const metadata: Metadata = { title: "Edit form" };

async function EditFormContent({ params }: PageProps<"/settings/capture/forms/[id]">) {
  const { org } = await requireSettingsAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: form } = await supabase.from("capture_forms").select("*").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!form) notFound();

  const [stages, sources, members, { count }] = await Promise.all([
    getStages(org.id),
    getSources(org.id),
    getMembers(org.id),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("capture_form_id", form.id),
  ]);
  const fields = readFields(form.fields);

  return (
    <div className="space-y-12">
      <SettingsSection title="Put it on your website" description={`${count ?? 0} lead${count === 1 ? "" : "s"} so far from this form.`}>
        {form.is_active ? (
          <EmbedCode siteUrl={env.siteUrl} publicId={form.public_id} fields={fields} hasConsent={Boolean(form.consent_text)} />
        ) : (
          <p className="text-sm text-zinc-500">This form is switched off. Turn on “Accepting submissions” below to use it.</p>
        )}
      </SettingsSection>

      <SettingsSection title={form.name}>
        <CaptureFormEditor
          action={saveCaptureForm.bind(null, form.id)}
          initial={{
            name: form.name,
            fields,
            default_stage_id: form.default_stage_id ?? "",
            default_source_id: form.default_source_id ?? "",
            owner_mode: form.round_robin ? "round_robin" : form.default_owner_id ? "fixed" : "org_owner",
            default_owner_id: form.default_owner_id ?? "",
            consent_text: form.consent_text ?? "",
            redirect_url: form.redirect_url ?? "",
            allowed_origins: form.allowed_origins.join("\n"),
            notify_owner: form.notify_owner,
            is_active: form.is_active,
          }}
          stages={stages.filter((s) => !s.is_won && !s.is_lost)}
          sources={sources}
          members={members}
          submitLabel="Save form"
        />
      </SettingsSection>

      <div className="flex justify-end">
        <TrashButton action={deleteCaptureForm.bind(null, form.id)} confirmText={`Delete “${form.name}”? Websites using it will stop working. Leads it created are kept.`} />
      </div>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function EditFormPage(props: PageProps<"/settings/capture/forms/[id]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EditFormContent {...props} />
    </Suspense>
  );
}

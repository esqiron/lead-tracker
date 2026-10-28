import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageSpinner } from "@/components/page-spinner";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { getPublicForm, renderedAt } from "@/lib/capture-forms";
import { param } from "@/lib/forms";

export const metadata: Metadata = { title: "Contact us", robots: { index: false } };

const INPUT_TYPES: Record<string, string> = { email: "email", phone: "tel" };
const AUTOCOMPLETE: Record<string, string> = {
  first_name: "given-name",
  last_name: "family-name",
  email: "email",
  phone: "tel",
  company: "organization",
  title: "organization-title",
};

// Public, embeddable form (see Settings → Lead capture). Posts to the
// submissions endpoint; works without JavaScript.
async function HostedFormContent({ params, searchParams }: PageProps<"/f/[publicId]">) {
  await connection();
  const { publicId } = await params;
  const sp = await searchParams;
  const form = await getPublicForm(publicId);
  if (!form) notFound();

  if (param(sp.sent)) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-lg font-semibold">Thanks, we got your message.</h1>
        <p className="mt-1 text-sm text-zinc-500">{form.organizations.name} will be in touch soon.</p>
      </div>
    );
  }

  const error = param(sp.error);
  return (
    <form action={`/api/v1/forms/${form.public_id}`} method="post" className="space-y-4">
      {error ? <Alert>{error.slice(0, 200)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {form.fields.map((field) => (
          <div key={field.key} className={field.key === "message" || field.key === "email" ? "sm:col-span-2" : undefined}>
            <Field label={field.required ? field.label : `${field.label} (optional)`} htmlFor={field.key}>
              {field.key === "message" ? (
                <Textarea id={field.key} name={field.key} required={field.required} rows={4} maxLength={5000} />
              ) : (
                <Input
                  id={field.key}
                  name={field.key}
                  type={INPUT_TYPES[field.key] ?? "text"}
                  autoComplete={AUTOCOMPLETE[field.key]}
                  required={field.required}
                  maxLength={field.key === "email" ? 254 : 200}
                />
              )}
            </Field>
          </div>
        ))}
      </div>
      {form.consent_text ? (
        <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" name="consent" value="on" required className="mt-1" />
          <span>{form.consent_text}</span>
        </label>
      ) : null}
      {/* Spam traps: hidden from people, filled by bots; and when the form was shown. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="_t" value={renderedAt()} />
      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Send
      </button>
    </form>
  );
}

export default function HostedFormPage(props: PageProps<"/f/[publicId]">) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Suspense fallback={<PageSpinner />}>
        <HostedFormContent {...props} />
      </Suspense>
    </main>
  );
}

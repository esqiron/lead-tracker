// Fields a hosted capture form can show. Shared by the form editor (client)
// and the submission endpoint (server).

export const FORM_FIELD_KEYS = ["first_name", "last_name", "email", "phone", "company", "title", "message"] as const;
export type FormFieldKey = (typeof FORM_FIELD_KEYS)[number];
export type FormField = { key: FormFieldKey; label: string; required: boolean };

export const DEFAULT_FIELD_LABELS: Record<FormFieldKey, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  title: "Job title",
  message: "Message",
};

// Coerces the stored jsonb into known fields only.
export function readFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((f) => {
    if (!f || typeof f !== "object") return [];
    const { key, label, required } = f as Record<string, unknown>;
    if (!FORM_FIELD_KEYS.includes(key as FormFieldKey)) return [];
    return [{ key: key as FormFieldKey, label: typeof label === "string" && label.trim() ? label.trim() : DEFAULT_FIELD_LABELS[key as FormFieldKey], required: required === true }];
  });
}

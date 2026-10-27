// Columns an imported CSV can map to. Contact fields always apply; lead
// fields create a lead for the row when "Lead name" is mapped.

export const IMPORT_FIELDS = [
  { key: "first_name", label: "First name", group: "Contact", aliases: ["first name", "firstname", "given name", "prenume"] },
  { key: "last_name", label: "Last name", group: "Contact", aliases: ["last name", "lastname", "surname", "family name", "nume"] },
  { key: "full_name", label: "Full name (split into first/last)", group: "Contact", aliases: ["name", "full name", "contact", "contact name"] },
  { key: "email", label: "Email", group: "Contact", aliases: ["email", "e-mail", "email address", "mail"] },
  { key: "phone", label: "Phone", group: "Contact", aliases: ["phone", "telephone", "mobile", "phone number", "telefon"] },
  { key: "title", label: "Job title", group: "Contact", aliases: ["title", "job title", "position", "role"] },
  { key: "company", label: "Company", group: "Contact", aliases: ["company", "organization", "organisation", "account", "company name", "firma"] },
  { key: "tags", label: "Tags", group: "Contact", aliases: ["tags", "labels"] },
  { key: "notes", label: "Notes", group: "Contact", aliases: ["notes", "note", "comments", "description"] },
  { key: "owner_email", label: "Owner email", group: "Contact", aliases: ["owner", "owner email", "assigned to", "sales rep"] },
  { key: "lead_title", label: "Lead name", group: "Lead", aliases: ["lead", "lead name", "deal", "deal name", "opportunity"] },
  { key: "lead_value", label: "Lead value", group: "Lead", aliases: ["value", "amount", "deal value", "lead value"] },
  { key: "lead_stage", label: "Lead stage", group: "Lead", aliases: ["stage", "deal stage", "status", "pipeline stage"] },
  { key: "lead_source", label: "Lead source", group: "Lead", aliases: ["source", "lead source", "channel"] },
  { key: "lead_close_date", label: "Expected close date", group: "Lead", aliases: ["close date", "expected close", "expected close date"] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];
export type ImportRow = Partial<Record<ImportFieldKey, string>>;

const normalize = (s: string) => s.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

// Best-guess mapping from CSV headers; each field is used at most once.
export function guessMapping(headers: string[]): (ImportFieldKey | "")[] {
  const used = new Set<string>();
  return headers.map((header) => {
    const h = normalize(header);
    const match = IMPORT_FIELDS.find((f) => !used.has(f.key) && f.aliases.some((a) => normalize(a) === h));
    if (!match) return "";
    used.add(match.key);
    return match.key;
  });
}

export const IMPORT_BATCH_SIZE = 200;
export const IMPORT_MAX_ROWS = 10_000;

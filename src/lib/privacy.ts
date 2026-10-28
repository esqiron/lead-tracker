import type { Database } from "@/lib/database.types";

export type LawfulBasis = Database["public"]["Enums"]["lawful_basis"];

// GDPR Art. 6 grounds that fit a sales pipeline.
export const LAWFUL_BASES: { value: LawfulBasis; label: string; description: string }[] = [
  { value: "consent", label: "Consent", description: "They agreed to be contacted, e.g. ticked a form's consent box." },
  { value: "contract", label: "Contract", description: "They're a customer, or asked for a quote or a contract." },
  { value: "legitimate_interest", label: "Legitimate interest", description: "B2B prospecting or follow-up they'd reasonably expect." },
  { value: "legal_obligation", label: "Legal obligation", description: "You must keep this data by law, e.g. for invoices." },
];

export function lawfulBasisLabel(value: string | null | undefined) {
  return LAWFUL_BASES.find((b) => b.value === value)?.label ?? null;
}

export function isLawfulBasis(value: string): value is LawfulBasis {
  return LAWFUL_BASES.some((b) => b.value === value);
}

export const CONTACT_RETENTION_OPTIONS = [6, 12, 24, 36, 60];
export const AUDIT_RETENTION_OPTIONS = [12, 24, 36, 60, 84];

import { toCsv } from "@/lib/csv";

// Sample file whose headers the importer recognizes automatically.
export function GET() {
  const body = toCsv(
    ["First name", "Last name", "Email", "Phone", "Job title", "Company", "Tags", "Lead name", "Value", "Stage", "Source", "Expected close date"],
    [
      ["Ana", "Popescu", "ana.popescu@example.com", "+40 721 000 000", "Head of Operations", "Northwind Traders", "vip; newsletter", "Website redesign", "4500", "Qualified", "Referral", "2026-12-15"],
      ["David", "Klein", "david.klein@example.com", "", "CTO", "Atlas Logistics", "", "", "", "", "", ""],
    ],
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lead-tracker-import-sample.csv"',
    },
  });
}

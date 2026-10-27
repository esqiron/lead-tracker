// Lenient parsing of spreadsheet values during import.

// "1,234.50", "1.234,50", "€ 2 500", "2500" → number. Returns null if unreadable.
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "1,234,567" is thousands; "12,5" is a decimal.
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

// Accepts ISO dates, and otherwise reads day/month order from the org's
// date format ("dd.MM.yyyy", "MM/dd/yyyy", …). Returns yyyy-MM-dd or null.
export function parseDay(raw: string, dateFormat: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    const parts = s.split(/[./\-\s]+/).map(Number);
    if (parts.length < 3 || parts.some((p) => !Number.isFinite(p))) return null;
    const monthFirst = dateFormat.startsWith("MM");
    [m, d] = monthFirst ? [parts[0]!, parts[1]!] : [parts[1]!, parts[0]!];
    y = parts[2]! < 100 ? 2000 + parts[2]! : parts[2]!;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

export function parseTags(raw: string) {
  return [...new Set(raw.split(/[;,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

// "Ana Maria Popescu" → first "Ana Maria", last "Popescu".
export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1)! };
}

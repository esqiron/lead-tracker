// Display helpers. Dates follow the organization's date format and time zone.

type OrgFormat = { date_format: string; timezone: string };

export function formatMoney(value: number | string, currency: string) {
  // Fixed locale so server- and client-rendered amounts match.
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
}

function applyFormat(format: string, parts: { yyyy: string; MM: string; dd: string }) {
  return format.replace("yyyy", parts.yyyy).replace("MM", parts.MM).replace("dd", parts.dd);
}

// For `date` columns (no time, no zone), e.g. expected_close_date.
export function formatDay(value: string | null | undefined, org: OrgFormat) {
  if (!value) return "";
  const [yyyy, MM, dd] = value.slice(0, 10).split("-");
  return applyFormat(org.date_format, { yyyy, MM, dd });
}

function zonedParts(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { yyyy: get("year"), MM: get("month"), dd: get("day"), time: `${get("hour")}:${get("minute")}` };
}

// For timestamps, shown in the org's time zone.
export function formatDate(value: string | null | undefined, org: OrgFormat) {
  if (!value) return "";
  return applyFormat(org.date_format, zonedParts(value, org.timezone));
}

export function formatDateTime(value: string | null | undefined, org: OrgFormat) {
  if (!value) return "";
  const parts = zonedParts(value, org.timezone);
  return `${applyFormat(org.date_format, parts)} ${parts.time}`;
}

// Today's date in the org's time zone, as yyyy-MM-dd (for comparing with date columns).
export function todayIn(timeZone: string) {
  const { yyyy, MM, dd } = zonedParts(new Date(), timeZone);
  return `${yyyy}-${MM}-${dd}`;
}

export function contactName(contact: { first_name: string | null; last_name: string | null; email?: string | null } | null) {
  if (!contact) return "";
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  return name || contact.email || "Unnamed contact";
}

export function personName(person: { full_name: string | null; email: string } | null | undefined) {
  if (!person) return "";
  return person.full_name || person.email;
}

export function initials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// Converts a wall-clock time in `timeZone` (e.g. from <input type="datetime-local">)
// to an ISO timestamp.
export function zonedToISO(local: string, timeZone: string) {
  const [day, time = "00:00"] = local.split("T");
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  // How far the zone is from UTC at that moment, then correct for it.
  const parts = zonedParts(new Date(asUtc), timeZone);
  const zoned = Date.UTC(Number(parts.yyyy), Number(parts.MM) - 1, Number(parts.dd), ...parts.time.split(":").map(Number) as [number, number]);
  return new Date(asUtc - (zoned - asUtc)).toISOString();
}

// The reverse: an ISO timestamp as a datetime-local value in `timeZone`.
export function isoToZonedInput(value: string | null | undefined, timeZone: string) {
  if (!value) return "";
  const p = zonedParts(value, timeZone);
  return `${p.yyyy}-${p.MM}-${p.dd}T${p.time}`;
}

// Goals are set per calendar quarter, identified by the quarter's first day (YYYY-MM-DD).

export function quarterStart(day: string) {
  const [y, m] = day.split("-").map(Number) as [number, number];
  return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
}

export function addQuarters(start: string, n: number) {
  const [y, m] = start.split("-").map(Number) as [number, number];
  const months = y * 12 + (m - 1) + n * 3;
  return `${Math.floor(months / 12)}-${String((months % 12) + 1).padStart(2, "0")}-01`;
}

export const isQuarterStart = (value: string | undefined): value is string => Boolean(value && /^\d{4}-(01|04|07|10)-01$/.test(value));

// "Q4 2026"
export function quarterLabel(start: string) {
  const [y, m] = start.split("-").map(Number) as [number, number];
  return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
}

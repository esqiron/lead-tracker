export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Only allow same-site relative redirects.
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string, confirm?: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirm !== undefined && password !== confirm) {
    return "Passwords don't match.";
  }
}

export function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

// For PostgREST ilike patterns.
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Search terms end up inside PostgREST filter strings (e.g. `or=(...)`), where
// commas, parentheses and quotes are syntax. Dropping them is fine for search.
export function cleanSearch(value: string | string[] | undefined) {
  const raw = typeof value === "string" ? value : "";
  return raw.replace(/[,()"'\\%_*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export function param(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : undefined;
}

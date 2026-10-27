import { cleanSearch, param } from "@/lib/forms";

// Filters for the leads and contacts lists, read from the URL. The list pages
// and their CSV exports share these so an export matches what's on screen.

type Search = Record<string, string | string[] | undefined>;

// The subset of the supabase-js filter builder these helpers use.
interface Filterable<T> {
  ilike(column: string, pattern: string): T;
  eq(column: string, value: string): T;
  is(column: string, value: null): T;
  or(filters: string): T;
  contains(column: string, value: string[]): T;
}

export type LeadFilters = { q: string; owner?: string; source?: string; status?: "open" | "won" | "lost" };

export function readLeadFilters(sp: Search): LeadFilters {
  const status = param(sp.status);
  return {
    q: cleanSearch(sp.q),
    owner: param(sp.owner),
    source: param(sp.source),
    status: status === "open" || status === "won" || status === "lost" ? status : undefined,
  };
}

function applyOwner<T extends Filterable<T>>(query: T, owner: string | undefined, userId: string): T {
  if (owner === "me") return query.eq("owner_id", userId);
  if (owner === "none") return query.is("owner_id", null);
  if (owner) return query.eq("owner_id", owner);
  return query;
}

export function applyLeadFilters<T extends Filterable<T>>(query: T, f: LeadFilters, userId: string, opts: { status: boolean }): T {
  let q = query;
  if (f.q) q = q.ilike("title", `%${f.q}%`);
  q = applyOwner(q, f.owner, userId);
  if (f.source) q = q.eq("source_id", f.source);
  if (opts.status && f.status) q = q.eq("status", f.status);
  return q;
}

export type ContactFilters = { q: string; owner?: string; tag?: string };

export function readContactFilters(sp: Search): ContactFilters {
  return { q: cleanSearch(sp.q), owner: param(sp.owner), tag: param(sp.tag) };
}

export function applyContactFilters<T extends Filterable<T>>(query: T, f: ContactFilters, userId: string): T {
  let q = query;
  // Match each word against name or email, so "ana pop" finds Ana Popescu.
  for (const word of f.q ? f.q.split(" ") : []) {
    q = q.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%,email.ilike.%${word}%`);
  }
  q = applyOwner(q, f.owner, userId);
  if (f.tag) q = q.contains("tags", [f.tag]);
  return q;
}

export function queryString(sp: Search) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) if (typeof value === "string" && value) params.set(key, value);
  return params.toString();
}

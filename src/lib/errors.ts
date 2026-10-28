// Turns database errors into messages that are safe to show. Our own SQL
// functions raise human-readable messages on purpose; everything else
// (constraint names, table names, Postgres internals) is logged, not shown.

type DbError = { code?: string; message: string } | null | undefined;

// Error codes our functions use with messages written for users.
const OWN_CODES = new Set(["P0001", "P0002", "22023"]);

export function userMessage(error: DbError, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  const { code = "", message } = error;

  // Postgres' own messages start with a lowercase letter by convention; the
  // ones our functions raise are sentences starting with a capital.
  const ours = /^[A-Z]/.test(message);
  if (ours && (OWN_CODES.has(code) || code === "42501" || code === "23503")) return message;
  if (code === "42501") return "You don't have permission to do that.";
  if (code === "23505") return "That already exists.";
  if (code === "23503") return "Something this refers to no longer exists. Reload and try again.";

  console.error("Unexpected database error", error);
  return fallback;
}

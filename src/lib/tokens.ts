import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function generateToken() {
  return randomBytes(32).toString("base64url");
}

// Must match encode(sha256(convert_to(token, 'UTF8')), 'hex') in the database.
export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

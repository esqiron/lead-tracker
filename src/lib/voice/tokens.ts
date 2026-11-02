import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { supabaseSecretKey } from "@/lib/env";

// Signed tokens the voice routes hand to the browser and take back:
// - a speak token, so /api/voice/speak only voices the assistant's own replies
//   instead of being a free text-to-speech service on the operator's key;
// - a pending action, a change the assistant proposed that only runs once the
//   user confirms it in a later turn (see buildTools).

const SPEAK_TTL_MS = 10 * 60 * 1000;
const PENDING_TTL_MS = 5 * 60 * 1000;

function key() {
  return createHash("sha256").update(`lt-voice-token:${supabaseSecretKey()}`).digest();
}

function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

function verify(payload: string, sig: string) {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const digest = (text: string) => createHash("sha256").update(text).digest("base64url");

export function speakToken(userId: string, text: string) {
  const exp = Date.now() + SPEAK_TTL_MS;
  return `${exp}.${sign(`speak.${userId}.${exp}.${digest(text)}`)}`;
}

export function checkSpeakToken(userId: string, text: string, token: unknown) {
  if (typeof token !== "string") return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return verify(`speak.${userId}.${exp}.${digest(text)}`, sig);
}

export type PendingAction = { tool: string; input: string };

export function pendingToken(userId: string, action: PendingAction) {
  const payload = Buffer.from(JSON.stringify({ u: userId, ...action, exp: Date.now() + PENDING_TTL_MS })).toString("base64url");
  return `${payload}.${sign(`pending.${payload}`)}`;
}

export function readPendingToken(userId: string, token: unknown): PendingAction | null {
  if (typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !verify(`pending.${payload}`, sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; tool: string; input: string; exp: number };
    return data.u === userId && data.exp > Date.now() ? { tool: data.tool, input: data.input } : null;
  } catch {
    return null;
  }
}

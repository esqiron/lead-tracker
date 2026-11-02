import "server-only";
import { connection } from "next/server";
import { deploymentMode } from "@/lib/env";
import { voiceConfig, type LlmProvider } from "@/lib/voice/config";

// The operator of a hosted instance and the services it shares data with,
// for the legal pages (/privacy, /terms, /dpa). They only exist in hosted mode
// with the operator's details set, so a half-filled document is never shown.

export type Subprocessor = { name: string; purpose: string; location?: string };

export type LegalInfo = {
  entity: string;
  address: string;
  email: string;
  taxId?: string;
  registration?: string;
  governingLaw?: string;
  courts?: string;
  authority?: string;
  updated: string;
  subprocessors: Subprocessor[];
};

const LLM_VENDORS: Record<LlmProvider, string> = {
  anthropic: "Anthropic PBC",
  openai: "OpenAI, L.L.C.",
  google: "Google LLC (Gemini API)",
};

const env = (name: string) => process.env[name]?.trim() || undefined;

// "Vercel Inc. (USA)" → name and location.
function provider(value: string, purpose: string): Subprocessor {
  const m = /^(.*?)\s*\(([^()]+)\)$/.exec(value);
  return m ? { name: m[1], purpose, location: m[2] } : { name: value, purpose };
}

// For pages: reads the settings per request, so they come from the runtime
// environment rather than whatever was set when the app was built.
export async function requestLegalInfo() {
  await connection();
  return legalInfo();
}

export function legalInfo(): LegalInfo | null {
  const entity = env("LEGAL_ENTITY");
  const address = env("LEGAL_ADDRESS");
  const email = env("PRIVACY_EMAIL");
  if (deploymentMode() !== "hosted" || !entity || !address || !email) return null;

  const subprocessors: Subprocessor[] = [
    { name: "Supabase, Inc.", purpose: "Database, sign-in and backups", location: env("LEGAL_DATABASE_REGION") },
  ];
  const hosting = env("LEGAL_HOSTING_PROVIDER");
  if (hosting) subprocessors.push(provider(hosting, "Runs the application"));
  const mail = env("LEGAL_EMAIL_PROVIDER");
  if (mail) subprocessors.push(provider(mail, "Sends invitation and password reset emails"));

  const voice = voiceConfig();
  if (voice) {
    subprocessors.push(
      { name: "ElevenLabs Inc.", purpose: "Voice assistant: speech-to-text and text-to-speech", location: "USA" },
      { name: LLM_VENDORS[voice.provider], purpose: "Voice assistant: understanding requests", location: "USA" },
    );
  }

  return {
    entity,
    address,
    email,
    taxId: env("LEGAL_TAX_ID"),
    registration: env("LEGAL_REGISTRATION"),
    governingLaw: env("LEGAL_GOVERNING_LAW"),
    courts: env("LEGAL_COURTS"),
    authority: env("LEGAL_SUPERVISORY_AUTHORITY"),
    updated: env("LEGAL_UPDATED") ?? "2 November 2026",
    subprocessors,
  };
}

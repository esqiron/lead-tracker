// Pulls contact details out of a pasted email signature or forwarded email.
// Runs in the browser; nothing pasted is sent anywhere until the form is saved.

export type ParsedSignature = {
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
};

const TITLE_WORDS =
  /\b(head|director|manager|lead|founder|co-founder|owner|ceo|cto|cfo|coo|cmo|vp|vice president|president|partner|officer|engineer|designer|consultant|specialist|coordinator|analyst|architect|sales|marketing|operations|product|procurement)\b/i;
const COMPANY_SUFFIX = /\b(ltd|limited|gmbh|inc|llc|srl|s\.r\.l\.|sa|s\.a\.|as|ab|bv|b\.v\.|oy|plc|co\.|group|studio|labs|agency)\b\.?$/i;
const SIGN_OFF = /^(best|kind|warm)?\s*(regards|wishes|thanks|thank you|cheers|br|sincerely|mvh|mfg|cu drag)[,!.]*$/i;

export function parseSignature(text: string): ParsedSignature {
  const out: ParsedSignature = {};
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[>\s|*]+/, "").trim())
    // Forwarded-mail headers and separators aren't part of the signature.
    .filter((l) => l && !/^-{2,}|-{2,}$/.test(l) && !/^(from|to|cc|date|sent|subject|von|an|datum|betreff)\s*:/i.test(l));

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) out.email = email.toLowerCase();

  const phone = text.match(/(?:\+|00)\d[\d\s().-]{6,}\d|\b0\d[\d\s().-]{7,}\d/)?.[0];
  if (phone) out.phone = phone.replace(/\s+/g, " ").trim();

  const url = text.replace(/\S+@\S+/g, " ").match(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?:\/[^\s]*)?/gi)?.find((u) => !u.includes("@"));
  if (url) out.website = url.startsWith("http") ? url : `https://${url.replace(/^www\./, "www.")}`;
  else if (email) {
    const domain = email.split("@")[1];
    if (!/^(gmail|googlemail|outlook|hotmail|yahoo|icloud|proton|protonmail|gmx|live)\./.test(domain)) out.website = `https://${domain}`;
  }

  const plain = lines.filter((l) => !l.includes("@") && !/\d{4,}/.test(l.replace(/\s/g, "")) && !/^(https?:|www\.)/i.test(l) && !SIGN_OFF.test(l));
  // "From: Jonas Berg <jonas@…>" in forwarded mail.
  const from = text.match(/^\s*(?:from|von|de)\s*:\s*"?([^"<\n]+?)"?\s*</im)?.[1];
  const nameLine = from ?? plain.find((l) => /^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’.-]*){1,2}$/u.test(l) && !TITLE_WORDS.test(l) && !COMPANY_SUFFIX.test(l));
  if (nameLine) {
    const parts = nameLine.trim().split(/\s+/);
    out.firstName = parts[0];
    out.lastName = parts.slice(1).join(" ") || undefined;
  }

  // Title and company sit under the name in a signature block.
  const nameAt = nameLine ? plain.lastIndexOf(nameLine) : -1;
  const rest = plain.slice(nameAt + 1).filter((l) => l !== nameLine && !/[.!?:]$/.test(l));
  // "Head of Digital, Halden Ferries" or "Head of Digital | Halden Ferries" on one line.
  const combined = rest.find((l) => TITLE_WORDS.test(l) && /[,|·@–-]\s/.test(l));
  if (combined) {
    const [t, c] = combined.split(/\s*(?:,|\||·|@|–|-)\s+/);
    out.title = t;
    if (c) out.company = c;
  } else {
    const title = rest.find((l) => TITLE_WORDS.test(l) && l.length <= 60);
    if (title) out.title = title;
  }
  if (!out.company) {
    const company =
      rest.find((l) => COMPANY_SUFFIX.test(l)) ??
      rest.find((l) => l !== out.title && l.length <= 50 && /^[\p{Lu}0-9]/u.test(l) && !TITLE_WORDS.test(l));
    if (company) out.company = company;
  }
  return out;
}

// "haldenferries.no" → "Haldenferries", for a company name suggestion.
export function companyFromDomain(domain: string) {
  const name = domain.replace(/^www\./, "").split(".")[0] ?? "";
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

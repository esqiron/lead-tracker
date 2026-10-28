"use client";

import { useState } from "react";
import { Button, cx } from "@/components/ui";
import type { FormField } from "@/lib/capture-fields";

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Copy-paste snippets for putting a capture form on another website.
export function EmbedCode({ siteUrl, publicId, fields, hasConsent }: { siteUrl: string; publicId: string; fields: FormField[]; hasConsent: boolean }) {
  const pageUrl = `${siteUrl}/f/${publicId}`;
  const height = 220 + fields.length * 80 + (hasConsent ? 50 : 0);
  const snippets = {
    link: pageUrl,
    iframe: `<iframe src="${pageUrl}" title="Contact form" loading="lazy" style="width:100%;max-width:560px;height:${height}px;border:0"></iframe>`,
    html: [
      `<form action="${siteUrl}/api/v1/forms/${publicId}" method="post">`,
      ...fields.map((f) =>
        f.key === "message"
          ? `  <textarea name="message" placeholder="${escapeAttr(f.label)}"${f.required ? " required" : ""}></textarea>`
          : `  <input name="${f.key}" type="${f.key === "email" ? "email" : f.key === "phone" ? "tel" : "text"}" placeholder="${escapeAttr(f.label)}"${f.required ? " required" : ""}>`,
      ),
      ...(hasConsent ? [`  <label><input type="checkbox" name="consent" required> I agree…</label>`] : []),
      `  <!-- Spam trap: keep hidden and empty -->`,
      `  <input name="_gotcha" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px">`,
      `  <button type="submit">Send</button>`,
      `</form>`,
    ].join("\n"),
  };
  const tabs = [
    { key: "iframe", label: "Embed (iframe)", hint: "Paste into any page. Works on WordPress, Webflow, Wix, Squarespace and plain HTML." },
    { key: "html", label: "Your own HTML", hint: "Style it yourself. Fields must keep these names. Errors show on the hosted page." },
    { key: "link", label: "Link", hint: "Share it in emails, social bios or QR codes." },
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("iframe");
  const [copied, setCopied] = useState(false);
  const current = tabs.find((t) => t.key === tab)!;

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setCopied(false);
            }}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm",
              tab === t.key ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-500">{current.hint}</p>
      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">{snippets[tab]}</pre>
      <Button
        type="button"
        variant="secondary"
        className="h-9"
        onClick={async () => {
          await navigator.clipboard.writeText(snippets[tab]);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

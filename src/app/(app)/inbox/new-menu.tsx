"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cx } from "@/components/ui";
import { searchLeads, type LeadMatch } from "./actions";
import { ComposeSheet, type ComposeOptions } from "./compose-sheet";

// Anything on the page can open the compose sheet with this event (e.g. the
// "Start a conversation" row at the top of a thread list).
export const COMPOSE_EVENT = "lt:compose";

const ITEMS = [
  { key: "c", id: "conversation", label: "New conversation", hint: "A deal with someone. Adds the person, company and deal in one go." },
  { key: "p", id: "person", label: "Add a person", hint: "Someone to keep in touch with, no deal yet." },
  { key: "l", id: "log", label: "Log on an existing deal", hint: "Find the conversation, then use its reply box." },
  { key: "i", id: "import", label: "Import from CSV", hint: "People and deals from a spreadsheet or another CRM." },
  { key: "f", id: "form", label: "Share your lead form", hint: "Copy your hosted form link. Leads land in Needs reply." },
] as const;

const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("dialog") !== null);

export function NewMenu({ options, formUrl }: { options: ComposeOptions; formUrl: string | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeadMatch[]>([]);
  const [copied, setCopied] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  // Closing the menu also clears the deal search and the "copied" note.
  const closeMenu = () => {
    setMenuOpen(false);
    setSearching(false);
    setQuery("");
    setResults([]);
    setCopied(false);
  };

  const choose = (id: (typeof ITEMS)[number]["id"]) => {
    if (id === "conversation") {
      closeMenu();
      setComposeOpen(true);
    } else if (id === "person") router.push("/contacts/new");
    else if (id === "import") router.push("/contacts/import");
    else if (id === "log") setSearching(true);
    else if (id === "form") {
      if (!formUrl) return router.push("/settings/capture");
      navigator.clipboard?.writeText(formUrl).then(
        () => setCopied(true),
        () => router.push("/settings/capture"),
      );
    }
  };

  // C opens the menu; with it open, a letter picks an item; Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target)) return;
      const key = e.key.toLowerCase();
      if (!menuOpen && key === "c") {
        e.preventDefault();
        setMenuOpen(true);
      } else if (menuOpen && key === "escape") closeMenu();
      else if (menuOpen && !searching) {
        const item = ITEMS.find((i) => i.key === key);
        if (item) {
          e.preventDefault();
          choose(item.id);
        }
      }
    };
    const onCompose = () => setComposeOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMPOSE_EVENT, onCompose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMPOSE_EVENT, onCompose);
    };
  });

  // Close on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => searchLeads(query).then(setResults), 180);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_22px_-12px_rgba(16,24,40,0.7)] hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
      >
        <span aria-hidden>+</span> New
        <kbd className="rounded bg-white/15 px-1.5 text-[10px] dark:bg-zinc-900/10">C</kbd>
      </button>

      {menuOpen ? (
        <div role="menu" className="absolute top-full left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-hairline dark:bg-zinc-900">
          {searching ? (
            <div className="p-1.5">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeMenu()}
                placeholder="Find a deal by name"
                aria-label="Find a deal"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
              <ul className="mt-1">
                {query.trim().length >= 2 && !results.length ? <li className="px-3 py-2 text-sm text-zinc-500">No deal by that name.</li> : null}
                {results.map((r) => (
                  <li key={r.id}>
                    <Link href={r.path} onClick={closeMenu} className="block rounded-xl px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <span className="block text-sm font-medium">{r.title}</span>
                      <span className="block text-xs text-zinc-500">{r.who}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p className="px-3 pt-1.5 pb-1 text-xs text-zinc-400">Add to Lead Tracker</p>
              {ITEMS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(item.id)}
                  className={cx(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    i === 0 && "bg-accent-soft/60 hover:bg-accent-soft",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cx("block text-sm font-medium", i === 0 && "text-accent-ink")}>
                      {item.id === "form" && copied ? "Link copied" : item.label}
                    </span>
                    <span className="block text-xs text-zinc-500">{item.id === "form" && !formUrl ? "Set up a form first, in Settings › Capture." : item.hint}</span>
                  </span>
                  <kbd className="mt-0.5 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-500 uppercase dark:border-zinc-700">{item.key}</kbd>
                </button>
              ))}
              <p className="px-3 pt-1 pb-1.5 text-xs text-zinc-400">Press C anywhere to open this menu, then a letter.</p>
            </>
          )}
        </div>
      ) : null}

      {composeOpen ? <ComposeSheet open onClose={() => setComposeOpen(false)} options={options} /> : null}
    </div>
  );
}

export function StartConversationRow() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COMPOSE_EVENT))}
      className="mx-1.5 mb-1 flex w-[calc(100%-0.75rem)] items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-left text-sm text-zinc-500 hover:border-accent hover:text-accent dark:border-zinc-700"
    >
      <span aria-hidden>+</span>
      <span className="font-medium whitespace-nowrap">Start a conversation</span>
      <span className="truncate text-xs text-zinc-400">with someone new or in People</span>
    </button>
  );
}

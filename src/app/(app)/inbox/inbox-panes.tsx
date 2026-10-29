"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { cx } from "@/components/ui";

// Three panes on desktop (folders · threads · open thread). Below md it's two
// pages: the folder and its list, then the thread on its own.
export function InboxPanes({ sidebar, list, children }: { sidebar: ReactNode; list: ReactNode; children: ReactNode }) {
  const threadOpen = useSelectedLayoutSegment() !== null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:h-[calc(100dvh-7.5rem)] md:grid-cols-[13.5rem_minmax(0,22rem)_minmax(0,1fr)] md:gap-0">
      <div className={cx("min-h-0 md:pr-4", threadOpen && "hidden md:block")}>{sidebar}</div>
      <div
        className={cx(
          "min-h-0 rounded-2xl bg-white/70 shadow-sm ring-1 ring-hairline md:rounded-r-none dark:bg-zinc-900/60",
          threadOpen && "hidden md:block",
        )}
      >
        {list}
      </div>
      <div
        className={cx(
          "min-h-0 rounded-2xl bg-white shadow-sm ring-1 ring-hairline md:rounded-l-none dark:bg-zinc-900",
          !threadOpen && "hidden md:block",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ThreadLink({ id, href, children }: { id: string; href: string; children: ReactNode }) {
  const active = useSelectedLayoutSegment() === id;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "block rounded-xl px-3 py-3 transition-colors duration-300 ease-studio",
        active
          ? "bg-white shadow-sm ring-1 ring-accent/30 dark:bg-zinc-800"
          : "hover:bg-white/80 dark:hover:bg-zinc-800/60",
      )}
    >
      {children}
    </Link>
  );
}

// Inbox keys: J/K open the next or previous thread in the list, / starts a
// reply (with the command menu open), E marks the pinned next step done.
export const COMPOSER_EVENT = "lt:composer";

const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("dialog") !== null);

export function ThreadKeys({ hrefs }: { hrefs: { id: string; href: string }[] }) {
  const router = useRouter();
  const current = useSelectedLayoutSegment();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "j" || key === "k") {
        const at = hrefs.findIndex((h) => h.id === current);
        const next = hrefs[key === "j" ? at + 1 : at < 0 ? 0 : at - 1];
        if (next) {
          e.preventDefault();
          router.push(next.href);
        }
      } else if (e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new Event(COMPOSER_EVENT));
      } else if (key === "e") {
        const button = document.querySelector<HTMLButtonElement>("[data-mark-done]");
        if (button) {
          e.preventDefault();
          button.click();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hrefs, current, router]);
  return null;
}

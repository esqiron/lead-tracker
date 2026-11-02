import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Bezel, Eyebrow, Logo, cx } from "@/components/ui";
import { requestLegalInfo } from "@/lib/legal";

// The Studio frame for pages outside the app: sign-in, sign-up, setup,
// password reset, invitations. The headline sits on the canvas; the form sits
// in a double-bezel card below it.
export function AuthShell({
  eyebrow,
  title,
  description,
  aside,
  wide,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  // A link for the top-right corner, e.g. between sign-in and sign-up.
  aside?: ReactNode;
  // Room for longer forms.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="studio-canvas flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        {aside}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-4 pb-10 sm:pt-6 sm:pb-16">
        <div className={cx("w-full", wide ? "max-w-[30rem]" : "max-w-[26rem]")}>
          <div className="text-center">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h1 className="mt-4 font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-zinc-900 sm:text-[2.5rem] dark:text-zinc-100">
              {title}
            </h1>
            {description ? (
              <p className="mx-auto mt-3 max-w-[24rem] text-[15px] leading-relaxed text-pretty text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          <Bezel className="mt-8" innerClassName="p-5 sm:p-7">
            {children}
          </Bezel>
          <Suspense fallback={null}>
            <LegalLinks />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

// "New here? Create an account" in the header.
export function AuthAside({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="flex items-center gap-1 rounded-full bg-white/70 py-1 pr-1 pl-3.5 text-sm text-zinc-500 ring-1 ring-hairline backdrop-blur dark:bg-zinc-900/70 dark:text-zinc-400">
      <span className="hidden sm:inline">{prompt}</span>
      <Link
        href={href}
        className="rounded-full bg-zinc-900 px-3.5 py-1.5 font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-colors duration-300 ease-studio hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {label}
      </Link>
    </p>
  );
}

// Read per request, so static auth pages don't keep the build's settings.
async function LegalLinks() {
  if (!(await requestLegalInfo())) return null;
  return (
    <p className="mt-6 flex justify-center gap-4 text-xs text-zinc-500">
      <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">
        Terms
      </Link>
      <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
        Privacy
      </Link>
    </p>
  );
}

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";
import { getContext } from "@/lib/auth";
import { AppNav } from "./app-nav";

// Shell for the signed-in app. Kept static so it renders instantly; the
// bits that depend on the session stream in.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="shrink-0">
            <Logo />
          </Link>
          <AppNav />
          <div className="ml-auto flex items-center gap-2">
            <Suspense fallback={null}>
              <CurrentUser />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

async function CurrentUser() {
  const ctx = await getContext();
  if (!ctx) return null;
  return (
    <span className="hidden max-w-56 truncate text-sm text-zinc-500 md:inline">
      {ctx.org?.name}
      {ctx.org ? " · " : ""}
      {ctx.user.fullName ?? ctx.user.email}
    </span>
  );
}

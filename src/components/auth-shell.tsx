import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Card, Logo } from "@/components/ui";
import { requestLegalInfo } from "@/lib/legal";

export function AuthShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </Card>
        <Suspense fallback={null}>
          <LegalLinks />
        </Suspense>
      </div>
    </main>
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

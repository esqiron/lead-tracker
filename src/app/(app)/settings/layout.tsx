import { Suspense, type ReactNode } from "react";
import { getContext, isAdminRole } from "@/lib/auth";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[12rem_minmax(0,1fr)]">
      <aside className="min-w-0">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
        <Suspense fallback={<SettingsNav isAdmin={false} />}>
          <RoleAwareNav />
        </Suspense>
      </aside>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </div>
  );
}

async function RoleAwareNav() {
  const ctx = await getContext();
  return <SettingsNav isAdmin={isAdminRole(ctx?.role ?? null)} />;
}

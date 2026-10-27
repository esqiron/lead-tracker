import type { ReactNode } from "react";

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

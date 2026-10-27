import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
};

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const controlClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 " +
  "focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500 " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300 dark:disabled:bg-zinc-800";

// Full width unless the caller sets a width (cx doesn't merge conflicting classes).
const widthClass = (className?: string) => (/(^|\s)(sm:|md:)?w-/.test(className ?? "") ? "" : "w-full");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(controlClass, widthClass(className), className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(controlClass, widthClass(className), "pr-8", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-sm text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    info: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2.5 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950", className)}
      {...props}
    />
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
      <span aria-hidden className="grid size-6 place-items-center rounded-md bg-zinc-900 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-900">
        LT
      </span>
      Lead Tracker
    </span>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(
        "min-h-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400",
        "focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900",
        "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  won: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  lost: "bg-zinc-100 text-zinc-500 line-through decoration-zinc-400/60 dark:bg-zinc-800 dark:text-zinc-400",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: { name: string; is_won: boolean; is_lost: boolean } | null }) {
  if (!stage) return null;
  return <Badge tone={stage.is_won ? "won" : stage.is_lost ? "lost" : "neutral"}>{stage.name}</Badge>;
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
        {description ? <div className="mt-1 text-sm text-zinc-500">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

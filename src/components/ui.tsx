import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary:
    "bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_22px_-12px_rgba(11,116,128,0.8)] hover:bg-accent-hover dark:text-zinc-950",
  secondary:
    "bg-white text-zinc-900 shadow-sm ring-1 ring-hairline hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
};

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4.5 text-sm font-medium whitespace-nowrap transition-colors duration-300 ease-studio",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const controlClass =
  "h-10 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 " +
  "focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 disabled:bg-zinc-50 disabled:text-zinc-500 " +
  "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800";

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
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-2xl bg-white shadow-sm ring-1 ring-hairline dark:bg-zinc-900", className)}
      {...props}
    />
  );
}

// Studio's "double bezel": a tinted shell with the white card set inside it.
export function Bezel({ className, innerClassName, children }: { className?: string; innerClassName?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-[1.875rem] bg-zinc-900/[0.035] p-1.5 inset-ring-1 inset-ring-hairline dark:bg-white/[0.035]", className)}>
      <div
        className={cx(
          "rounded-3xl bg-white shadow-[0_0_0_1px_rgba(21,24,29,0.04),0_1px_2px_rgba(16,24,40,0.04),0_10px_24px_-14px_rgba(16,24,40,0.2)] dark:bg-zinc-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Small uppercase label in a pill, above page titles.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-white/70 px-3 py-1.5 text-[10px] leading-none font-semibold tracking-[0.18em] text-zinc-500 uppercase ring-1 ring-hairline dark:bg-zinc-900/70 dark:text-zinc-400">
      {children}
    </span>
  );
}

// The arrow in a circle at the end of a primary button. The button needs `relative`.
export function ButtonArrow() {
  return (
    <span aria-hidden className="absolute top-1 right-1 bottom-1 grid aspect-square place-items-center rounded-full bg-white/20 dark:bg-zinc-950/15">
      <svg viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
        <path d="M5 10h10M11 6l4 4-4 4" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 font-display text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-[9px] bg-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_14px_-6px_rgba(16,24,40,0.5)] dark:bg-zinc-800"
      >
        <span className="size-2.5 rounded-full bg-accent ring-3 ring-white/15" />
      </span>
      Lead Tracker
    </span>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(
        "min-h-20 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400",
        "focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15",
        "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  won: "bg-accent-soft text-accent-ink",
  lost: "bg-zinc-100 text-zinc-500 line-through decoration-zinc-400/60 dark:bg-zinc-800 dark:text-zinc-400",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", badgeTones[tone])}>
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
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">{title}</h1>
        {description ? <div className="mt-1 text-sm text-zinc-500">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-transparent">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

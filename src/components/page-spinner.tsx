export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24" aria-busy="true" aria-label="Loading">
      <span className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
    </div>
  );
}

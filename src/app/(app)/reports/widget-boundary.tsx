"use client";

import { Component, type ReactNode } from "react";

// One widget failing to load shouldn't take the dashboard down with it.
export class WidgetBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex h-full min-h-32 flex-col justify-center rounded-xl border border-dashed border-zinc-300 bg-white/50 p-4 text-sm dark:border-zinc-700 dark:bg-transparent">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{this.props.title} couldn&apos;t load</p>
        <p className="mt-0.5 text-zinc-500">Reload the page to try again. The rest of the dashboard is unaffected.</p>
      </div>
    );
  }
}

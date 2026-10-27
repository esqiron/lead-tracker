"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export function CopyField({ value, label = "Link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex gap-2">
      <Input readOnly value={value} aria-label={label} className="h-9 font-mono text-xs" onFocus={(e) => e.target.select()} />
      <Button
        type="button"
        variant="secondary"
        className="h-9 shrink-0"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

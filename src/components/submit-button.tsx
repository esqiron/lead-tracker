"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/components/ui";

export function SubmitButton({
  pendingLabel,
  children,
  variant,
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button, ButtonArrow, cx, type ButtonVariant } from "@/components/ui";

export function SubmitButton({
  pendingLabel,
  children,
  variant,
  arrow,
  className,
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string; variant?: ButtonVariant; arrow?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cx(arrow && "relative h-11 px-12", className)}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
      {arrow && !pending ? <ButtonArrow /> : null}
    </Button>
  );
}

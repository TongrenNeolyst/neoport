import * as React from "react";

import { cn } from "@/lib/cn";

export type BadgeTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "secondary"
  // Legacy values for backward compatibility
  | "blue"
  | "amber"
  | "green"
  | "red"
  | "zinc";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({
  className,
  tone = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-medium",
        // Default / accent
        (tone === "default" || tone === "accent" || tone === "blue") && "bg-[var(--accent-soft)] text-[var(--accent)]",
        // Success / green
        (tone === "success" || tone === "green") && "bg-[var(--success-soft)] text-[var(--success)]",
        // Warning / amber
        (tone === "warning" || tone === "amber") && "bg-[var(--warning-soft)] text-[var(--warning)]",
        // Error / red
        (tone === "error" || tone === "red") && "bg-[var(--error-soft)] text-[var(--error)]",
        // Secondary / zinc
        (tone === "secondary" || tone === "zinc") && "bg-[var(--bg-surface-hover)] text-[var(--fg-secondary)]",
        className,
      )}
      {...props}
    />
  );
}

Badge.displayName = "Badge";

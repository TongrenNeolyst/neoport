import * as React from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-sm font-medium",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
        isDisabled && "cursor-wait opacity-50",
        // Variants
        variant === "primary" && "bg-[var(--accent)] text-white hover:brightness-110 [&:not(:hover)]:shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-md)]",
        variant === "secondary" && "bg-[var(--bg-surface)] text-[var(--fg-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)]",
        variant === "outline" && "bg-transparent text-[var(--fg-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)]",
        variant === "danger" && "bg-[var(--error)] text-white hover:brightness-110",
        variant === "ghost" && "bg-transparent text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--fg-primary)]",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  );
}

Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

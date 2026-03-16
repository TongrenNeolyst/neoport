import * as React from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="space-y-1">
        {label ? (
          <label
            className="text-sm font-medium text-[var(--fg-secondary)]"
            htmlFor={inputId}
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-primary)]",
            "placeholder:text-[var(--fg-tertiary)]",
            "outline-none ring-offset-0",
            "transition-all duration-200",
            "hover:border-[var(--border-strong)]",
            "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] focus:ring-offset-2 focus:ring-offset-[var(--bg-canvas)]",
            "resize-none",
            error && "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error-soft)]",
            className,
          )}
          {...props}
        />
        {error ? <p className="text-xs text-[var(--error)]">{error}</p> : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

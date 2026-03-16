import * as React from "react";

import { cn } from "@/lib/cn";

export type CardVariant = "default" | "elevated";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6",
        variant === "default" && "transition-all duration-200 hover:-translate-y-[2px] hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)]",
        variant === "elevated" && "bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    />
  );
}

Card.displayName = "Card";

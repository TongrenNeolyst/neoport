import * as React from "react";

import { cn } from "@/lib/cn";

export type TableProps = React.TableHTMLAttributes<HTMLTableElement>;

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <table
        className={cn("min-w-full text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

Table.displayName = "Table";

export function THead({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <thead
      className={cn("bg-[var(--bg-canvas-subtle)] text-[var(--fg-tertiary)]", className)}
      {...props}
    />
  );
}

THead.displayName = "THead";

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-surface-hover)]",
        className,
      )}
      {...props}
    />
  );
}

TR.displayName = "TR";

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]",
        className,
      )}
      {...props}
    />
  );
}

TH.displayName = "TH";

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 text-[var(--fg-primary)]", className)}
      {...props}
    />
  );
}

TD.displayName = "TD";

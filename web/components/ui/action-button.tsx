import { cn } from "@/lib/cn";

export type ActionButtonTone = "default" | "danger";

export type ActionButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
};

export function ActionButton({
  children,
  onClick,
  tone = "default",
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "rounded-[6px] border border-[var(--border-default)] px-3 py-1 text-xs font-medium",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white"
          : "bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-hover)]",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

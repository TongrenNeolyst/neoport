"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

// Simple ID generator for browser compatibility
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type ToastType = "success" | "error";

type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs: number;
};

type ToastContextValue = {
  success: (message: string, opts?: { title?: string; durationMs?: number }) => void;
  error: (message: string, opts?: { title?: string; durationMs?: number }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const push = React.useCallback(
    (type: ToastType, message: string, opts?: { title?: string; durationMs?: number }) => {
      const id = generateId();
      const durationMs = opts?.durationMs ?? (type === "success" ? 3000 : 5000);
      const toast: ToastItem = { id, type, title: opts?.title, message, durationMs };
      setToasts((prev) => [toast, ...prev]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    [],
  );

  const value: ToastContextValue = React.useMemo(
    () => ({
      success: (message, opts) => push("success", message, opts),
      error: (message, opts) => push("error", message, opts),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      className="fixed left-1/2 top-6 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-[12px] border px-4 py-3 text-sm shadow-[var(--shadow-lg)]",
            "backdrop-blur-md",
            "animate-[toast-in_200ms_ease-out]",
            t.type === "success"
              ? "border-[var(--success)]/30 bg-[var(--bg-elevated)]/80 text-[var(--fg-primary)]"
              : "border-[var(--error)]/30 bg-[var(--bg-elevated)]/80 text-[var(--fg-primary)]",
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              t.type === "success"
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--error-soft)] text-[var(--error)]"
            )}>
              {t.type === "success" ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {t.title ? <div className="font-medium text-[var(--fg-primary)]">{t.title}</div> : null}
              <div className="break-words text-[var(--fg-secondary)]">{t.message}</div>
            </div>
          </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes toast-in {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

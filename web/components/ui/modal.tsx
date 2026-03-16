"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

export type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [render, setRender] = React.useState(open);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }

    if (!render) return;
    const t = window.setTimeout(() => setRender(false), 200);
    return () => window.clearTimeout(t);
  }, [open, render]);

  if (!mounted || !render) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm",
          open
            ? "animate-[modal-overlay-in_200ms_ease-out]"
            : "animate-[modal-overlay-out_200ms_ease-in]",
        )}
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 mx-4 w-full max-w-md rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6",
          "shadow-[var(--shadow-lg)]",
          open
            ? "animate-[modal-in_200ms_ease-out]"
            : "animate-[modal-out_200ms_ease-in]",
          className,
        )}
      >
        {(title || description) && (
          <div className="mb-4 space-y-1">
            {title ? (
              <h2 className="text-base font-semibold text-[var(--fg-primary)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-[var(--fg-secondary)]">{description}</p>
            ) : null}
          </div>
        )}

        <div>{children}</div>

        {footer ? (
          <div className="mt-6 flex justify-end gap-2">{footer}</div>
        ) : null}
      </div>
      <style jsx global>{`
        @keyframes modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-overlay-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modal-in {
          from {
            transform: translateY(6px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes modal-out {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(6px) scale(0.98);
            opacity: 0;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

Modal.displayName = "Modal";

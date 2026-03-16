"use client";

import * as React from "react";
import { useActionState } from "react";

import { ParticleField } from "@/components/particles/particle-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  requestPasswordResetAction,
  signInWithPasswordAction,
} from "@/features/auth";

export default function LoginPage() {
  const toast = useToast();

  const [loginState, loginAction, loginPending] = useActionState(
    signInWithPasswordAction,
    null,
  );

  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [forgotState, forgotAction, forgotPending] = useActionState(
    requestPasswordResetAction,
    null,
  );

  React.useEffect(() => {
    if (!loginState) return;
    if (!loginState.ok) {
      toast.error(loginState.error, { title: "Error" });
    }
  }, [loginState, toast]);

  React.useEffect(() => {
    if (!forgotState) return;
    if (forgotState.ok) {
      toast.success("If this email exists, a reset link has been sent.", {
        title: "Success",
      });
    } else {
      toast.error(forgotState.error, { title: "Error" });
    }
  }, [forgotState, toast]);

  function openForgotPassword() {
    setForgotOpen(true);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleField />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 px-6 py-8 backdrop-blur-md">
          <div className="mb-10 space-y-2 text-center">
            <h1 className="text-3xl font-bold text-[var(--fg-primary)]">
              The Future is Now
            </h1>
            <p className="text-sm text-[var(--fg-secondary)]">
              Research Report Management System
            </p>
          </div>

          <form className="space-y-4" action={loginAction}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              name="email"
              error={loginState && !loginState.ok ? loginState.error : undefined}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              name="password"
            />

            <Button className="w-full" type="submit" isLoading={loginPending}>
              Login
            </Button>

            <div className="flex justify-center">
              <button
                type="button"
                className="text-sm text-[var(--fg-secondary)] underline decoration-[var(--border-default)] underline-offset-4 hover:text-[var(--fg-primary)]"
                onClick={openForgotPassword}
              >
                Forgot password
              </button>
            </div>
          </form>
        </div>
      </div>

      <Modal
        open={forgotOpen}
        title="Reset password"
        description="Enter your email address to receive a reset link."
        onClose={() => setForgotOpen(false)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setForgotOpen(false)}>
              Close
            </Button>
            <Button type="submit" form="forgot-form" isLoading={forgotPending}>
              Submit
            </Button>
          </>
        }
      >
        <form id="forgot-form" className="space-y-3" action={forgotAction}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            name="email"
            error={
              forgotState && !forgotState.ok ? forgotState.error : undefined
            }
          />
          <p className="text-sm text-[var(--fg-secondary)]">
            We will always show the same success message to protect your privacy.
          </p>
        </form>
      </Modal>
    </div>
  );
}

"use server";

import { redirect } from "next/navigation";

import { requestPasswordResetSchema, signInSchema } from "@/domain/schemas/auth";
import { err, ok, type Result } from "@/lib/result";
import { requestPasswordReset, signInWithPassword, signOut } from "./repo/auth-repo";

type AuthActionState = Result<null> | null;

export async function signInWithPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { email, password } = parsed.data;

  const res = await signInWithPassword({ email, password });
  if (!res.ok) {
    // Don't leak backend details.
    return err("Invalid email or password.");
  }

  redirect("/desktop");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = {
    email: String(formData.get("email") ?? "").trim(),
  };

  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { email } = parsed.data;

  // Avoid email enumeration: always show success for valid email format.
  await requestPasswordReset({ email });

  return ok(null);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}

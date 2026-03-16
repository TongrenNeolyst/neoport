import "server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export async function signInWithPassword(params: {
  email: string;
  password: string;
}): Promise<Result<null>> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (error) return err(error.message);
  return ok(null);
}

export async function requestPasswordReset(params: {
  email: string;
}): Promise<Result<null>> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(params.email);
  if (error) return err(error.message);
  return ok(null);
}

export async function signOut(): Promise<Result<null>> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return err(error.message);
  return ok(null);
}

export async function exchangeCodeForSession(params: {
  code: string;
}): Promise<Result<null>> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(params.code);
  if (error) return err(error.message);
  return ok(null);
}

export async function verifyOtp(params: {
  token_hash: string;
  type: "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";
}): Promise<Result<null>> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: params.token_hash,
    type: params.type,
  });
  if (error) return err(error.message);
  return ok(null);
}


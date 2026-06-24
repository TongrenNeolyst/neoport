import "server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export type EmailConfig = {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass?: string;
  smtp_from: string;
  is_enabled: boolean;
  updated_at: string;
};

export type SubscriptionType = "normal" | "wind" | "tonghuashun" | "bloomberg_zh" | "bloomberg_en";

export type EmailSubscription = {
  id: string;
  email: string;
  user_id: string | null;
  subscription_type: SubscriptionType;
  created_at: string;
  is_active: boolean;
};

export async function getEmailConfig(): Promise<Result<EmailConfig | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("email_config")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return ok(null);
    }
    return err(error.message);
  }

  return ok(data as EmailConfig);
}

export async function updateEmailConfig(params: {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  is_enabled: boolean;
}): Promise<Result<EmailConfig>> {
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from("email_config")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("email_config")
      .update({
        smtp_host: params.smtp_host,
        smtp_port: params.smtp_port,
        smtp_user: params.smtp_user,
        smtp_pass: params.smtp_pass,
        smtp_from: params.smtp_from,
        is_enabled: params.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return err(error.message);
    return ok(data as EmailConfig);
  } else {
    const { data, error } = await supabase
      .from("email_config")
      .insert({
        smtp_host: params.smtp_host,
        smtp_port: params.smtp_port,
        smtp_user: params.smtp_user,
        smtp_pass: params.smtp_pass,
        smtp_from: params.smtp_from,
        is_enabled: params.is_enabled,
      })
      .select()
      .single();

    if (error) return err(error.message);
    return ok(data as EmailConfig);
  }
}

export async function listSubscriptions(): Promise<Result<EmailSubscription[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("email_subscription")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return err(error.message);
  return ok(data as EmailSubscription[]);
}

export async function addSubscription(
  email: string,
  subscriptionType: SubscriptionType = "normal",
): Promise<Result<EmailSubscription>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("email_subscription")
    .upsert(
      { email, is_active: true, subscription_type: subscriptionType },
      { onConflict: "email" },
    )
    .select()
    .single();

  if (error) return err(error.message);
  return ok(data as EmailSubscription);
}

export async function deleteSubscription(id: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("email_subscription")
    .delete()
    .eq("id", id);

  if (error) return err(error.message);
  return ok(null);
}

export async function getMySubscription(
  userId: string,
): Promise<Result<EmailSubscription | null>> {
  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser(userId);
  const userEmail = userData.user?.email;

  if (!userEmail) return ok(null);

  const { data, error } = await supabase
    .from("email_subscription")
    .select("*")
    .eq("email", userEmail)
    .maybeSingle();

  if (error) return err(error.message);
  return ok(data as EmailSubscription | null);
}

export async function subscribeMe(
  userId: string,
  subscriptionType: SubscriptionType = "normal",
): Promise<Result<EmailSubscription>> {
  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser(userId);
  const userEmail = userData.user?.email;

  if (!userEmail) return err("User email not found");

  const { data, error } = await supabase
    .from("email_subscription")
    .upsert(
      {
        email: userEmail,
        user_id: userId,
        is_active: true,
        subscription_type: subscriptionType,
      },
      { onConflict: "email" },
    )
    .select()
    .single();

  if (error) return err(error.message);
  return ok(data as EmailSubscription);
}

export async function unsubscribeMe(userId: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser(userId);
  const userEmail = userData.user?.email;

  if (!userEmail) return err("User email not found");

  const { error } = await supabase
    .from("email_subscription")
    .delete()
    .eq("email", userEmail);

  if (error) return err(error.message);
  return ok(null);
}

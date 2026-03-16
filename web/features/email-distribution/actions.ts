"use server";

import { err, ok, type Result } from "@/lib/result";
import { requireAuth } from "@/lib/supabase/server";

import {
  getEmailConfig,
  updateEmailConfig,
  listSubscriptions,
  addSubscription,
  deleteSubscription,
  subscribeMe,
  unsubscribeMe,
  getMySubscription,
  type EmailConfig,
  type EmailSubscription,
  type SubscriptionType,
} from "./repo/email-distribution-repo";

type Role = "admin" | "sa" | "analyst";

async function getActor(): Promise<
  Result<{ userId: string; role: Role }>
> {
  try {
    const user = await requireAuth();
    const role = user.app_metadata?.role as Role | undefined;
    if (role !== "admin" && role !== "sa" && role !== "analyst") {
      return err("No permission");
    }
    return ok({ userId: user.id, role });
  } catch {
    return err("Unauthorized");
  }
}

async function requireAdmin(): Promise<Result<{ userId: string }>> {
  try {
    const user = await requireAuth();
    const role = user.app_metadata?.role;
    if (role !== "admin") {
      return err("Admin only");
    }
    return ok({ userId: user.id });
  } catch {
    return err("Unauthorized");
  }
}

// Email Config (Admin only)

export async function getEmailConfigAction(): Promise<Result<EmailConfig | null>> {
  const actor = await requireAdmin();
  if (!actor.ok) {
    return actor;
  }

  const result = await getEmailConfig();
  if (!result.ok) {
    return result;
  }

  // Don't return password
  const config = result.data;
  if (config) {
    return ok({
      ...config,
      smtp_pass: undefined,
    });
  }

  return ok(null);
}

export async function updateEmailConfigAction(input: {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  is_enabled: boolean;
}): Promise<Result<EmailConfig>> {
  const actor = await requireAdmin();
  if (!actor.ok) {
    return actor;
  }

  return updateEmailConfig(input);
}

// Subscriptions

export async function listSubscriptionsAction(): Promise<Result<EmailSubscription[]>> {
  const actor = await requireAdmin();
  if (!actor.ok) {
    return actor;
  }

  return listSubscriptions();
}

export async function addSubscriptionAction(
  email: string,
  subscriptionType: SubscriptionType = "normal",
): Promise<Result<EmailSubscription>> {
  const actor = await requireAdmin();
  if (!actor.ok) {
    return actor;
  }

  return addSubscription(email, subscriptionType);
}

export async function deleteSubscriptionAction(id: string): Promise<Result<null>> {
  const actor = await requireAdmin();
  if (!actor.ok) {
    return actor;
  }

  return deleteSubscription(id);
}

// My subscription (any authenticated user)

export async function getMySubscriptionAction(): Promise<Result<EmailSubscription | null>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  return getMySubscription(actor.data.userId);
}

export async function subscribeMeAction(
  subscriptionType: SubscriptionType = "normal",
): Promise<Result<EmailSubscription>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  return subscribeMe(actor.data.userId, subscriptionType);
}

export async function unsubscribeMeAction(): Promise<Result<null>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  return unsubscribeMe(actor.data.userId);
}

import "server-only";

import type { User } from "@supabase/supabase-js";

import type { UserRole, UserRow, UserStatus } from "@/domain/user";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 12;
const BATCH_SIZE = 1000;
const MAX_USERS = 5000;

function toRole(raw: unknown): UserRole {
  return raw === "admin" || raw === "sa" || raw === "analyst" ? raw : "analyst";
}

function toStatus(u: User): UserStatus {
  const bannedUntil = (u as unknown as { banned_until?: string | null })
    .banned_until;
  if (!bannedUntil) return "active";
  const t = new Date(bannedUntil).getTime();
  if (Number.isNaN(t)) return "active";
  return t > Date.now() ? "banned" : "active";
}

function toRow(u: User): UserRow {
  const fullName =
    typeof u.user_metadata?.full_name === "string"
      ? u.user_metadata.full_name
      : null;

  return {
    id: u.id,
    email: u.email ?? "",
    fullName,
    role: toRole(u.app_metadata?.role),
    status: toStatus(u),
    createdAt: u.created_at,
  };
}

async function listAllUsersCapped() {
  const supabase = createAdminClient();

  const all: User[] = [];
  let page = 1;
  let total: number | null = null;

  while (all.length < MAX_USERS) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: BATCH_SIZE,
    });
    if (error) throw error;

    const users = data.users ?? [];
    total = typeof data.total === "number" ? data.total : total;
    all.push(...users);

    if (users.length === 0) break;
    if (total != null && all.length >= total) break;

    page += 1;
  }

  return { users: all, total: total ?? all.length };
}

export async function listUsers(params: {
  page: number;
  query: string | null;
}) {
  const { users } = await listAllUsersCapped();

  const q = (params.query ?? "").trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => {
        const email = (u.email ?? "").toLowerCase();
        const name =
          typeof u.user_metadata?.full_name === "string"
            ? u.user_metadata.full_name.toLowerCase()
            : "";
        return email.includes(q) || name.includes(q);
      })
    : users;

  const sorted = filtered
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page), totalPages);

  const start = (page - 1) * PAGE_SIZE;
  const items = sorted.slice(start, start + PAGE_SIZE).map(toRow);

  return { items, total, page, totalPages };
}

export async function inviteUser(params: {
  email: string;
  fullName: string;
  role: UserRole;
}) {
  const supabase = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`;

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    params.email,
    {
      data: { full_name: params.fullName },
      redirectTo,
    },
  );
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Invite failed.");

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: { ...(user.app_metadata ?? {}), role: params.role },
    },
  );
  if (updateError) throw updateError;

  return { id: user.id };
}

/**
 * Create user directly without email confirmation
 * Used when requireEmailConfirmation is false
 */
export async function createUser(params: {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
}) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: { full_name: params.fullName },
    app_metadata: { role: params.role },
  });

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Create user failed.");

  return { id: user.id };
}

export async function updateUser(params: {
  id: string;
  email: string;
  fullName: string;
}) {
  const supabase = createAdminClient();

  const { data: existing, error: getErr } =
    await supabase.auth.admin.getUserById(params.id);
  if (getErr) throw getErr;

  const prevMeta =
    (existing.user?.user_metadata as
      | Record<string, unknown>
      | null
      | undefined) ?? {};

  const { error } = await supabase.auth.admin.updateUserById(params.id, {
    email: params.email,
    user_metadata: { ...prevMeta, full_name: params.fullName },
  });
  if (error) throw error;
}

export async function setUserRole(params: { id: string; role: UserRole }) {
  const supabase = createAdminClient();

  const { data: existing, error: getErr } =
    await supabase.auth.admin.getUserById(params.id);
  if (getErr) throw getErr;

  const prevMeta =
    (existing.user?.app_metadata as
      | Record<string, unknown>
      | null
      | undefined) ?? {};

  const { error } = await supabase.auth.admin.updateUserById(params.id, {
    app_metadata: { ...prevMeta, role: params.role },
  });
  if (error) throw error;
}

export async function banUser(params: { id: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(params.id, {
    ban_duration: "876000h",
  });
  if (error) throw error;
}

export async function unbanUser(params: { id: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(params.id, {
    ban_duration: "none",
  });
  if (error) throw error;
}

export async function resetUserPassword(params: {
  id: string;
  newPassword: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(params.id, {
    password: params.newPassword,
  });
  if (error) throw error;
}

export async function deleteUser(params: { id: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) throw error;
}

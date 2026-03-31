"use server";

import { redirect } from "next/navigation";

import {
  deleteUserSchema,
  inviteUserSchema,
  resetUserPasswordSchema,
  setUserBannedSchema,
  setUserRoleSchema,
  updateUserSchema,
} from "@/domain/schemas/user";
import { err, ok, type Result } from "@/lib/result";
import { requireAdmin } from "@/lib/supabase/server";

import {
  banUser,
  createUser as createUserRepo,
  deleteUser,
  listUsers as listUsersRepo,
  resetUserPassword as resetUserPasswordRepo,
  setUserRole as setUserRoleRepo,
  unbanUser,
  updateUser as updateUserRepo,
} from "./repo/users-admin-repo";

async function requireAdminOrRedirect403() {
  try {
    await requireAdmin();
  } catch {
    redirect("/403");
  }
}

export async function listUsersAction(input: {
  page?: number;
  query?: string | null;
}): Promise<
  Result<{
    items: Awaited<ReturnType<typeof listUsersRepo>>["items"];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  await requireAdminOrRedirect403();

  const page = Math.max(1, input.page ?? 1);
  const query = input.query ?? null;

  try {
    const data = await listUsersRepo({ page, query });
    return ok(data);
  } catch {
    return err("Failed to list users.");
  }
}

export async function inviteUserAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  await requireAdminOrRedirect403();

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { email, fullName, role } = parsed.data;

  try {
    const data = await createUserRepo({
      email,
      fullName,
      role,
      password: "Passw0rd",
    });
    return ok(data);
  } catch {
    return err("Failed to create user.");
  }
}

export async function updateUserAction(input: unknown): Promise<Result<null>> {
  await requireAdminOrRedirect403();

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, email, fullName } = parsed.data;

  try {
    await updateUserRepo({ id, email, fullName });
    return ok(null);
  } catch {
    return err("Failed to update user.");
  }
}

export async function setUserRoleAction(input: unknown): Promise<Result<null>> {
  await requireAdminOrRedirect403();

  const parsed = setUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, role } = parsed.data;

  try {
    await setUserRoleRepo({ id, role });
    return ok(null);
  } catch {
    return err("Failed to update role.");
  }
}

export async function setUserBannedAction(
  input: unknown,
): Promise<Result<null>> {
  await requireAdminOrRedirect403();

  const parsed = setUserBannedSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, banned } = parsed.data;

  try {
    if (banned) await banUser({ id });
    else await unbanUser({ id });
    return ok(null);
  } catch {
    return err("Failed to update user status.");
  }
}

export async function resetUserPasswordAction(
  input: unknown,
): Promise<Result<null>> {
  await requireAdminOrRedirect403();

  const parsed = resetUserPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id, newPassword } = parsed.data;

  try {
    await resetUserPasswordRepo({ id, newPassword });
    return ok(null);
  } catch {
    return err("Failed to reset password.");
  }
}

export async function deleteUserAction(input: unknown): Promise<Result<null>> {
  await requireAdminOrRedirect403();

  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { id } = parsed.data;

  try {
    await deleteUser({ id });
    return ok(null);
  } catch {
    return err("Failed to delete user.");
  }
}

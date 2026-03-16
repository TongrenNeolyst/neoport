"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { UserRole, UserRow, UserStatus } from "@/domain/user";
import { emailSchema } from "@/domain/schemas/user";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatShanghaiYmd } from "@/lib/time";

import {
  deleteUserAction,
  inviteUserAction,
  resetUserPasswordAction,
  setUserBannedAction,
  setUserRoleAction,
  updateUserAction,
} from "../actions";

export type UsersPageClientProps = {
  items: UserRow[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
};

function roleTone(role: UserRole) {
  if (role === "admin") return "blue";
  if (role === "sa") return "amber";
  return "zinc";
}

function statusTone(status: UserStatus) {
  return status === "active" ? "green" : "red";
}

function toQueryString(params: { q: string; page: number }) {
  const q = params.q.trim();
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function UsersPageClient({
  items,
  total,
  page,
  totalPages,
  query,
}: UsersPageClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [queryDraft, setQueryDraft] = React.useState(query);
  React.useEffect(() => setQueryDraft(query), [query]);

  // Invite modal
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<UserRole>("analyst");
  const [inviteErrors, setInviteErrors] = React.useState<{
    email?: string;
    name?: string;
  }>({});
  const [inviteLoading, setInviteLoading] = React.useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editErrors, setEditErrors] = React.useState<{
    email?: string;
    name?: string;
  }>({});
  const [editLoading, setEditLoading] = React.useState(false);

  // Change role
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [roleId, setRoleId] = React.useState<string | null>(null);
  const [roleValue, setRoleValue] = React.useState<UserRole>("analyst");
  const [roleLoading, setRoleLoading] = React.useState(false);

  // Ban/Unban confirm
  const [banOpen, setBanOpen] = React.useState(false);
  const [banId, setBanId] = React.useState<string | null>(null);
  const [banTargetStatus, setBanTargetStatus] =
    React.useState<UserStatus>("active");
  const [banLoading, setBanLoading] = React.useState(false);

  // Reset password
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [resetError, setResetError] = React.useState<string | undefined>();
  const [resetLoading, setResetLoading] = React.useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  function openInvite() {
    setInviteEmail("");
    setInviteName("");
    setInviteRole("analyst");
    setInviteErrors({});
    setInviteOpen(true);
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();

    const email = inviteEmail.trim();
    const fullName = inviteName.trim();

    const next: { email?: string; name?: string } = {};
    if (!email) next.email = "Email is required";
    else if (!emailSchema.safeParse(email).success)
      next.email = "Invalid email format";
    if (!fullName) next.name = "Name is required";
    setInviteErrors(next);
    if (Object.keys(next).length) return;

    setInviteLoading(true);
    const res = await inviteUserAction({ email, fullName, role: inviteRole });
    setInviteLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setInviteOpen(false);
    toast.success("Invitation sent.", { title: "Success" });
    router.refresh();
  }

  function openEdit(u: UserRow) {
    setEditingId(u.id);
    setEditEmail(u.email);
    setEditName(u.fullName ?? "");
    setEditErrors({});
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    const email = editEmail.trim();
    const fullName = editName.trim();

    const next: { email?: string; name?: string } = {};
    if (!fullName) next.name = "Name is required";
    if (!email) next.email = "Email is required";
    else if (!emailSchema.safeParse(email).success)
      next.email = "Invalid email format";
    setEditErrors(next);
    if (Object.keys(next).length) return;

    setEditLoading(true);
    const res = await updateUserAction({ id: editingId, email, fullName });
    setEditLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setEditOpen(false);
    toast.success("User updated.", { title: "Success" });
    router.refresh();
  }

  function openChangeRole(u: UserRow) {
    setRoleId(u.id);
    setRoleValue(u.role);
    setRoleOpen(true);
  }

  async function submitChangeRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) return;

    setRoleLoading(true);
    const res = await setUserRoleAction({ id: roleId, role: roleValue });
    setRoleLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setRoleOpen(false);
    toast.success("Role updated.", { title: "Success" });
    router.refresh();
  }

  function openBan(u: UserRow) {
    setBanId(u.id);
    setBanTargetStatus(u.status);
    setBanOpen(true);
  }

  async function confirmBan() {
    if (!banId) return;

    const targetBanned = banTargetStatus === "active";
    setBanLoading(true);
    const res = await setUserBannedAction({ id: banId, banned: targetBanned });
    setBanLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setBanOpen(false);
    toast.success("User status updated.", { title: "Success" });
    router.refresh();
  }

  function openReset(u: UserRow) {
    setResetId(u.id);
    setNewPassword("");
    setResetError(undefined);
    setResetOpen(true);
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(undefined);

    const pw = newPassword.trim();
    if (!pw) {
      setResetError("Password is required");
      return;
    }
    if (!resetId) return;

    setResetLoading(true);
    const res = await resetUserPasswordAction({ id: resetId, newPassword: pw });
    setResetLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setResetOpen(false);
    toast.success("Password updated.", { title: "Success" });
  }

  function openDelete(u: UserRow) {
    setDeleteId(u.id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteLoading(true);
    const res = await deleteUserAction({ id: deleteId });
    setDeleteLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setDeleteOpen(false);
    toast.success("User deleted.", { title: "Success" });
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/users${toQueryString({ q: queryDraft, page: 1 })}`);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">Users</div>
          <Button onClick={openInvite}>Invite user</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <form className="w-full max-w-md" onSubmit={submitSearch}>
            <Input
              label="Search"
              placeholder="Search by email or name"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
            />
          </form>
          <div className="hidden text-sm text-[var(--fg-secondary)] sm:block">
            {total} users
          </div>
        </div>

        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Email</TH>
              <TH>Name</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {items.length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={6} className="py-10 text-center text-[var(--fg-secondary)]">
                  No users found
                </TD>
              </TR>
            ) : (
              items.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-[var(--fg-primary)]">{u.email}</TD>
                  <TD className="text-[var(--fg-secondary)]">{u.fullName ?? "-"}</TD>
                  <TD>
                    <Badge tone={roleTone(u.role)}>
                      {u.role.toUpperCase()}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={statusTone(u.status)}>
                      {u.status === "active" ? "ACTIVE" : "BANNED"}
                    </Badge>
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {formatShanghaiYmd(u.createdAt)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <ActionButton onClick={() => openEdit(u)}>
                        Edit
                      </ActionButton>
                      <ActionButton onClick={() => openChangeRole(u)}>
                        Role
                      </ActionButton>
                      <ActionButton onClick={() => openBan(u)}>
                        {u.status === "active" ? "Ban" : "Unban"}
                      </ActionButton>
                      <ActionButton onClick={() => openReset(u)}>
                        Reset PW
                      </ActionButton>
                      <ActionButton tone="danger" onClick={() => openDelete(u)}>
                        Delete
                      </ActionButton>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) =>
            router.push(`/users${toQueryString({ q: queryDraft, page: p })}`)
          }
        />
      </main>

      <Modal
        open={inviteOpen}
        title="Invite user"
        description="This will send an invitation email."
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="invite-form" isLoading={inviteLoading}>
              Invite
            </Button>
          </>
        }
      >
        <form id="invite-form" className="space-y-3" onSubmit={submitInvite}>
          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            error={inviteErrors.email}
          />
          <Input
            label="Name"
            placeholder="Full name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            error={inviteErrors.name}
          />

          <div className="space-y-1">
            <label
              className="text-sm font-medium text-[var(--fg-secondary)]"
              htmlFor="invite-role"
            >
              Role
            </label>
            <select
              id="invite-role"
              className="w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-primary)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
            >
              <option value="admin">Admin</option>
              <option value="sa">SA</option>
              <option value="analyst">Analyst</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        title="Edit user"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-form" isLoading={editLoading}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-form" className="space-y-3" onSubmit={submitEdit}>
          <Input
            label="Name"
            placeholder="Full name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            error={editErrors.name}
          />
          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            error={editErrors.email}
          />
        </form>
      </Modal>

      <Modal
        open={roleOpen}
        title="Change role"
        onClose={() => setRoleOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setRoleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="role-form" isLoading={roleLoading}>
              Confirm
            </Button>
          </>
        }
      >
        <form id="role-form" className="space-y-3" onSubmit={submitChangeRole}>
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-[var(--fg-secondary)]"
              htmlFor="role-select"
            >
              Role
            </label>
            <select
              id="role-select"
              className="w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-primary)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value as UserRole)}
            >
              <option value="admin">Admin</option>
              <option value="sa">SA</option>
              <option value="analyst">Analyst</option>
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={banOpen}
        title="Confirm"
        description={
          banTargetStatus === "active" ? "Ban this user?" : "Unban this user?"
        }
        onClose={() => setBanOpen(false)}
        onConfirm={confirmBan}
        confirmTone={banTargetStatus === "active" ? "danger" : "secondary"}
        confirmLabel={banTargetStatus === "active" ? "Ban" : "Unban"}
        loading={banLoading}
      />

      <Modal
        open={resetOpen}
        title="Reset password"
        description="Set a new password for this user."
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              form="reset-form"
              isLoading={resetLoading}
            >
              Reset
            </Button>
          </>
        }
      >
        <form id="reset-form" className="space-y-3" onSubmit={submitReset}>
          <Input
            label="New password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={resetError}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete user?"
        description="This action cannot be undone."
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        confirmTone="danger"
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}

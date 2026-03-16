"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
  createAnalystAction,
  deleteAnalystAction,
  getRegionsForSelectAction,
  updateAnalystAction,
} from "../actions";
import type { Analyst } from "../repo/analysts-repo";

export interface AnalystsPageClientProps {
  analysts: Analyst[];
  total: number;
  page: number;
  totalPages: number;
  currentQuery: string | null;
}

type RegionOption = { id: string; code: string; name_en: string; name_cn: string };

function toQueryString(params: { q: string; page: number }) {
  const q = params.q.trim();
  const sp = new URLSearchParams();
  if (q) sp.set("query", q);
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function AnalystsPageClient({
  analysts,
  total,
  page,
  totalPages,
  currentQuery,
}: AnalystsPageClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [queryDraft, setQueryDraft] = React.useState(currentQuery ?? "");
  React.useEffect(() => setQueryDraft(currentQuery ?? ""), [currentQuery]);

  // Create/Edit modal
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAnalyst, setEditingAnalyst] = React.useState<Analyst | null>(
    null,
  );
  const [regions, setRegions] = React.useState<RegionOption[]>([]);
  const [formFullName, setFormFullName] = React.useState("");
  const [formChineseName, setFormChineseName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formRegionCode, setFormRegionId] = React.useState("");
  const [formSuffix, setFormSuffix] = React.useState("");
  const [formSfc, setFormSfc] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formErrors, setFormErrors] = React.useState<{
    full_name?: string;
    email?: string;
    region_code?: string;
  }>({});
  const [formLoading, setFormLoading] = React.useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Load regions when modal opens
  React.useEffect(() => {
    if (formOpen) {
      setRegions([]);
      getRegionsForSelectAction()
        .then((result) => {
          if (result.ok && Array.isArray(result.data)) {
            setRegions(result.data);
          } else {
            toast.error("Failed to load regions", { title: "Error" });
          }
        })
        .catch(() => {
          toast.error("Failed to load regions", { title: "Error" });
        });
    }
  }, [formOpen, toast]);

  function openCreate() {
    setEditingAnalyst(null);
    setFormFullName("");
    setFormChineseName("");
    setFormEmail("");
    setFormRegionId("");
    setFormSuffix("");
    setFormSfc("");
    setFormIsActive(true);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(analyst: Analyst) {
    setEditingAnalyst(analyst);
    setFormFullName(analyst.full_name);
    setFormChineseName(analyst.chinese_name ?? "");
    setFormEmail(analyst.email);
    setFormRegionId(analyst.region_code ?? "");
    setFormSuffix(analyst.suffix ?? "");
    setFormSfc(analyst.sfc ?? "");
    setFormIsActive(analyst.is_active);
    setFormErrors({});
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();

    const full_name = formFullName.trim();
    const email = formEmail.trim();
    const region_code = formRegionCode;

    const next: { full_name?: string; email?: string; region_code?: string } = {};
    if (!full_name) next.full_name = "Full name is required";
    if (!email) next.email = "Email is required";
    if (!region_code) next.region_code = "Region is required";
    setFormErrors(next);
    if (Object.keys(next).length) return;

    setFormLoading(true);
    const data = {
      full_name,
      chinese_name: formChineseName.trim() || undefined,
      email,
      region_code,
      suffix: formSuffix.trim() || undefined,
      sfc: formSfc.trim() || undefined,
      is_active: formIsActive,
    };

    const res = editingAnalyst
      ? await updateAnalystAction(editingAnalyst.id, data)
      : await createAnalystAction(data);
    setFormLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setFormOpen(false);
    toast.success(editingAnalyst ? "Analyst updated." : "Analyst created.", {
      title: "Success",
    });
    router.refresh();
  }

  function openDelete(analyst: Analyst) {
    setDeleteId(analyst.id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteLoading(true);
    const res = await deleteAnalystAction(deleteId);
    setDeleteLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setDeleteOpen(false);
    toast.success("Analyst deleted.", { title: "Success" });
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/analyst-info${toQueryString({ q: queryDraft, page: 1 })}`);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">Analyst Info</div>
          <Button onClick={openCreate}>Create Analyst</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <form className="w-full max-w-md" onSubmit={submitSearch}>
            <Input
              label="Search"
              placeholder="Search by name or email"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
            />
          </form>
          <div className="hidden text-sm text-[var(--fg-secondary)] sm:block">
            {total} analysts
          </div>
        </div>

        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Full Name</TH>
              <TH>Chinese Name</TH>
              <TH>Email</TH>
              <TH>Region</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {analysts.length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={7} className="py-10 text-center text-[var(--fg-secondary)]">
                  No analysts found
                </TD>
              </TR>
            ) : (
              analysts.map((analyst) => (
                <TR key={analyst.id}>
                  <TD className="font-medium text-[var(--fg-primary)]">
                    {analyst.full_name}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {analyst.chinese_name || "-"}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">{analyst.email}</TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {analyst.region
                      ? `${analyst.region.name_en} (${analyst.region.code})`
                      : "-"}
                  </TD>
                  <TD>
                    <Badge tone={analyst.is_active ? "green" : "zinc"}>
                      {analyst.is_active ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {formatShanghaiYmd(analyst.created_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <ActionButton onClick={() => openEdit(analyst)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={() => openDelete(analyst)}
                      >
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
            router.push(
              `/analyst-info${toQueryString({ q: queryDraft, page: p })}`,
            )
          }
        />
      </main>

      <Modal
        open={formOpen}
        title={editingAnalyst ? "Edit analyst" : "Create analyst"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="analyst-form" isLoading={formLoading}>
              {editingAnalyst ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="analyst-form" className="space-y-3" onSubmit={submitForm}>
          <Input
            id="full_name"
            label="Full Name"
            placeholder="e.g., Zhang San"
            value={formFullName}
            onChange={(e) => setFormFullName(e.target.value)}
            error={formErrors.full_name}
          />
          <Input
            id="chinese_name"
            label="Chinese Name"
            placeholder="e.g., 张三"
            value={formChineseName}
            onChange={(e) => setFormChineseName(e.target.value)}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="e.g., zhangsan@example.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            error={formErrors.email}
          />
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-[var(--fg-secondary)]"
              htmlFor="region_code"
            >
              Region
            </label>
            <select
              id="region_code"
              value={formRegionCode}
              onChange={(e) => setFormRegionId(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--fg-primary)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              <option value="">Select a region...</option>
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name_en} ({region.code})
                </option>
              ))}
            </select>
            {formErrors.region_code && (
              <p className="text-xs text-red-400">{formErrors.region_code}</p>
            )}
          </div>
          <Input
            label="Suffix"
            placeholder="e.g., CFA"
            value={formSuffix}
            onChange={(e) => setFormSuffix(e.target.value)}
          />
          <Input
            label="SFC"
            placeholder="e.g., 12345678"
            value={formSfc}
            onChange={(e) => setFormSfc(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label
              className="text-sm font-medium text-[var(--fg-secondary)]"
              htmlFor="is_active"
            >
              Active
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete analyst?"
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

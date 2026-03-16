"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatShanghaiYmd } from "@/lib/time";
import {
  createSectorAction,
  deleteSectorAction,
  listLevel1SectorsAction,
  updateSectorAction,
} from "../actions";
import type { Sector } from "../repo/sectors-repo";

export interface SectorsPageClientProps {
  sectors: Sector[];
  total: number;
  page: number;
  totalPages: number;
  currentQuery: string | null;
  currentLevel?: 1 | 2;
}

function toQueryString(params: { q: string; page: number; level?: string }) {
  const q = params.q.trim();
  const sp = new URLSearchParams();
  if (q) sp.set("query", q);
  if (params.page > 1) sp.set("page", String(params.page));
  if (params.level) sp.set("level", params.level);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function SectorsPageClient({
  sectors,
  total,
  page,
  totalPages,
  currentQuery,
  currentLevel,
}: SectorsPageClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [queryDraft, setQueryDraft] = React.useState(currentQuery ?? "");
  const [levelFilter, setLevelFilter] = React.useState<string>(
    currentLevel?.toString() ?? "",
  );
  React.useEffect(() => {
    setQueryDraft(currentQuery ?? "");
    setLevelFilter(currentLevel?.toString() ?? "");
  }, [currentQuery, currentLevel]);

  // Level-1 sectors for parent selection
  const [level1Sectors, setLevel1Sectors] = React.useState<Sector[]>([]);
  React.useEffect(() => {
    listLevel1SectorsAction().then((result) => {
      if (result.ok) {
        setLevel1Sectors(result.data);
      }
    });
  }, []);

  // Create/Edit modal
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingSector, setEditingSector] = React.useState<Sector | null>(null);
  const [formLevel, setFormLevel] = React.useState<"1" | "2">("1");
  const [formNameEn, setFormNameEn] = React.useState("");
  const [formNameCn, setFormNameCn] = React.useState("");
  const [formWindName, setFormWindName] = React.useState("");
  const [formParentId, setFormParentId] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formLoading, setFormLoading] = React.useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  function openCreate() {
    setEditingSector(null);
    setFormLevel("1");
    setFormNameEn("");
    setFormNameCn("");
    setFormWindName("");
    setFormParentId("");
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(sector: Sector) {
    setEditingSector(sector);
    setFormLevel(sector.level.toString() as "1" | "2");
    setFormNameEn(sector.name_en);
    setFormNameCn(sector.name_cn ?? "");
    setFormWindName(sector.wind_name ?? "");
    setFormParentId(sector.parent_id ?? "");
    setFormErrors({});
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();

    const name_en = formNameEn.trim();
    const level = Number(formLevel) as 1 | 2;
    const parent_id = level === 2 ? formParentId : null;

    const next: Record<string, string> = {};
    if (!name_en) next.name_en = "English name is required";
    if (level === 2 && !parent_id)
      next.parent_id = "Parent sector is required for level 2";
    setFormErrors(next);
    if (Object.keys(next).length) return;

    setFormLoading(true);
    const res = editingSector
      ? await updateSectorAction(editingSector.id, {
          name_en,
          name_cn: formNameCn.trim() || null,
          wind_name: formWindName.trim() || null,
        })
      : await createSectorAction({
          level,
          name_en,
          name_cn: formNameCn.trim() || null,
          wind_name: formWindName.trim() || null,
          parent_id,
        });
    setFormLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setFormOpen(false);
    toast.success(editingSector ? "Sector updated." : "Sector created.", {
      title: "Success",
    });
    router.refresh();
  }

  function openDelete(sector: Sector) {
    setDeleteId(sector.id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteLoading(true);
    const res = await deleteSectorAction(deleteId);
    setDeleteLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setDeleteOpen(false);
    toast.success("Sector deleted.", { title: "Success" });
    router.refresh();
  }

  function doSearch() {
    router.push(
      `/sectors${toQueryString({ q: queryDraft, page: 1, level: levelFilter || undefined })}`,
    );
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    doSearch();
  }

  // Auto-search when filter changes
  function handleLevelChange(value: string) {
    setLevelFilter(value);
    router.push(
      `/sectors${toQueryString({ q: queryDraft, page: 1, level: value || undefined })}`,
    );
  }

  // Find parent name for level-2 sectors
  function getParentName(parentId: string | null): string {
    if (!parentId) return "-";
    const parent = level1Sectors.find((s) => s.id === parentId);
    return parent?.name_en ?? "-";
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">Sectors</div>
          <Button onClick={openCreate}>Create Sector</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <form className="flex flex-1 gap-4" onSubmit={submitSearch}>
            <div className="w-full max-w-md">
              <Input
                label="Search"
                placeholder="Search by name"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                label="Level"
                value={levelFilter}
                onChange={(e) => handleLevelChange(e.target.value)}
                options={[
                  { value: "", label: "All" },
                  { value: "1", label: "Level 1" },
                  { value: "2", label: "Level 2" },
                ]}
              />
            </div>
          </form>
          <div className="hidden text-sm text-[var(--fg-secondary)] sm:block">
            {total} sectors
          </div>
        </div>

        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Level</TH>
              <TH>English Name</TH>
              <TH>Chinese Name</TH>
              <TH>Parent</TH>
              <TH>Active</TH>
              <TH>Created</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {sectors.length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={7} className="py-10 text-center text-[var(--fg-secondary)]">
                  No sectors found
                </TD>
              </TR>
            ) : (
              sectors.map((sector) => (
                <TR key={sector.id}>
                  <TD>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        sector.level === 1
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      L{sector.level}
                    </span>
                  </TD>
                  <TD className="font-medium text-[var(--fg-primary)]">
                    {sector.name_en}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">{sector.name_cn ?? "-"}</TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {sector.level === 2 ? getParentName(sector.parent_id) : "-"}
                  </TD>
                  <TD>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        sector.is_active
                          ? "bg-green-500/20 text-green-300"
                          : "bg-zinc-500/20 text-[var(--fg-secondary)]"
                      }`}
                    >
                      {sector.is_active ? "Active" : "Inactive"}
                    </span>
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {formatShanghaiYmd(sector.created_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <ActionButton onClick={() => openEdit(sector)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        onClick={() => openDelete(sector)}
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
              `/sectors${toQueryString({ q: queryDraft, page: p, level: levelFilter || undefined })}`,
            )
          }
        />
      </main>

      <Modal
        open={formOpen}
        title={editingSector ? "Edit sector" : "Create sector"}
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
            <Button type="submit" form="sector-form" isLoading={formLoading}>
              {editingSector ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="sector-form" className="space-y-3" onSubmit={submitForm}>
          {!editingSector && (
            <Select
              label="Level"
              value={formLevel}
              onChange={(e) => setFormLevel(e.target.value as "1" | "2")}
              options={[
                { value: "1", label: "Level 1 (Top-level)" },
                { value: "2", label: "Level 2 (Sub-sector)" },
              ]}
            />
          )}
          {formLevel === "2" && !editingSector && (
            <Select
              label="Parent Sector"
              value={formParentId}
              onChange={(e) => setFormParentId(e.target.value)}
              options={[
                { value: "", label: "Select parent..." },
                ...level1Sectors.map((s) => ({
                  value: s.id,
                  label: s.name_en,
                })),
              ]}
              error={formErrors.parent_id}
            />
          )}
          <Input
            label="English Name"
            placeholder="e.g., Technology"
            value={formNameEn}
            onChange={(e) => setFormNameEn(e.target.value)}
            error={formErrors.name_en}
          />
          <Input
            label="Chinese Name"
            placeholder="e.g., 科技"
            value={formNameCn}
            onChange={(e) => setFormNameCn(e.target.value)}
          />
          <Input
            label="Wind Name"
            placeholder="Wind industry classification"
            value={formWindName}
            onChange={(e) => setFormWindName(e.target.value)}
          />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete sector?"
        description="This action cannot be undone. If this sector has coverage records or child sectors, deletion will fail."
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        confirmTone="danger"
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}

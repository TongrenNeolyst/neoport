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
  createCoverageAction,
  deleteCoverageAction,
  updateCoverageAction,
} from "../actions";
import type { CoverageWithDetails } from "../repo/coverage-repo";
import type { Sector } from "@/features/sectors/repo/sectors-repo";
import type { Analyst } from "@/features/analyst-info/repo/analysts-repo";
import type { Region } from "@/features/regions/repo/regions-repo";

export interface CoveragePageClientProps {
  coverages: CoverageWithDetails[];
  total: number;
  page: number;
  totalPages: number;
  currentQuery: string | null;
  currentSectorId: string | null;
  sectors: Sector[];
  analysts: Analyst[];
  regions: Region[];
  userRole: "admin" | "sa" | "analyst";
}

function toQueryString(params: {
  q: string;
  page: number;
  sector_id?: string;
}) {
  const q = params.q.trim();
  const sp = new URLSearchParams();
  if (q) sp.set("query", q);
  if (params.page > 1) sp.set("page", String(params.page));
  if (params.sector_id) sp.set("sector_id", params.sector_id);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

interface AnalystInput {
  analyst_id: string;
  role: number;
  sort_order: number;
}

export function CoveragePageClient({
  coverages,
  total,
  page,
  totalPages,
  currentQuery,
  currentSectorId,
  sectors,
  analysts,
  regions,
  userRole,
}: CoveragePageClientProps) {
  const router = useRouter();
  const toast = useToast();
  const canEdit = userRole === "admin" || userRole === "sa";
  const canCreate = userRole === "admin" || userRole === "sa" || userRole === "analyst";
  const activeSectorIds = React.useMemo(
    () => new Set(sectors.map((item) => item.id)),
    [sectors],
  );
  const activeAnalystIds = React.useMemo(
    () => new Set(analysts.map((item) => item.id)),
    [analysts],
  );

  const [queryDraft, setQueryDraft] = React.useState(currentQuery ?? "");
  const [sectorFilter, setSectorFilter] = React.useState(currentSectorId ?? "");
  React.useEffect(() => {
    setQueryDraft(currentQuery ?? "");
    setSectorFilter(currentSectorId ?? "");
  }, [currentQuery, currentSectorId]);

  // Create/Edit modal
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCoverage, setEditingCoverage] =
    React.useState<CoverageWithDetails | null>(null);
  const [formTicker, setFormTicker] = React.useState("");
  const [formCountry, setFormCountry] = React.useState("");
  const [formEnglishName, setFormEnglishName] = React.useState("");
  const [formChineseName, setFormChineseName] = React.useState("");
  const [formTraditionalChinese, setFormTraditionalChinese] =
    React.useState("");
  const [formSectorId, setFormSectorId] = React.useState("");
  const [formIsin, setFormIsin] = React.useState("");
  const [formCurrency, setFormCurrency] = React.useState("");
  const [formAdsFactor, setFormAdsFactor] = React.useState("");
  const [formAnalysts, setFormAnalysts] = React.useState<AnalystInput[]>([
    { analyst_id: "", role: 1, sort_order: 1 },
  ]);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formLoading, setFormLoading] = React.useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  function openCreate() {
    if (!canCreate) {
      toast.error("No permission to create coverage.", { title: "Error" });
      return;
    }

    setEditingCoverage(null);
    setFormTicker("");
    setFormCountry("");
    setFormEnglishName("");
    setFormChineseName("");
    setFormTraditionalChinese("");
    setFormSectorId("");
    setFormIsin("");
    setFormCurrency("");
    setFormAdsFactor("");
    setFormAnalysts([{ analyst_id: "", role: 1, sort_order: 1 }]);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(coverage: CoverageWithDetails) {
    setEditingCoverage(coverage);
    setFormTicker(coverage.ticker);
    setFormCountry(coverage.country_of_domicile);
    setFormEnglishName(coverage.english_full_name);
    setFormChineseName(coverage.chinese_short_name ?? "");
    setFormTraditionalChinese(coverage.traditional_chinese ?? "");
    setFormSectorId(coverage.sector_id);
    setFormIsin(coverage.isin);
    setFormCurrency(coverage.reporting_currency ?? "");
    setFormAdsFactor(coverage.ads_conversion_factor?.toString() ?? "");
    setFormAnalysts(
      coverage.analysts.length > 0
        ? coverage.analysts.map((a, i) => ({
            analyst_id: a.analyst_id,
            role: a.role,
            sort_order: i + 1,
          }))
        : [{ analyst_id: "", role: 1, sort_order: 1 }],
    );
    setFormErrors({});
    setFormOpen(true);
  }

  function addAnalyst() {
    if (formAnalysts.length < 4) {
      setFormAnalysts([
        ...formAnalysts,
        {
          analyst_id: "",
          role: formAnalysts.length + 1,
          sort_order: formAnalysts.length + 1,
        },
      ]);
    }
  }

  function removeAnalyst(index: number) {
    if (formAnalysts.length > 1) {
      setFormAnalysts(formAnalysts.filter((_, i) => i !== index));
    }
  }

  function updateAnalyst(
    index: number,
    field: keyof AnalystInput,
    value: string | number,
  ) {
    const updated = [...formAnalysts];
    updated[index] = { ...updated[index], [field]: value };
    setFormAnalysts(updated);
  }

  function getAnalystOptions(index: number): { value: string; label: string }[] {
    const currentId = formAnalysts[index]?.analyst_id;
    const selectedByOthers = new Set(
      formAnalysts
        .filter((item, i) => i !== index && item.analyst_id)
        .map((item) => item.analyst_id),
    );

    return [
      { value: "", label: "Select analyst..." },
      ...analysts
        .filter((item) => item.id === currentId || !selectedByOthers.has(item.id))
        .map((item) => ({
          value: item.id,
          label: item.full_name,
        })),
    ];
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();

    if (editingCoverage && !canEdit) {
      toast.error("No permission to edit coverage.", { title: "Error" });
      return;
    }
    if (!editingCoverage && !canCreate) {
      toast.error("No permission to create coverage.", { title: "Error" });
      return;
    }

    const ticker = formTicker.trim();
    const country_of_domicile = formCountry.trim();
    const english_full_name = formEnglishName.trim();
    const sector_id = formSectorId;
    const isin = formIsin.trim();
    const validAnalysts = formAnalysts.filter((a) => a.analyst_id);

    const next: Record<string, string> = {};
    if (!ticker) next.ticker = "Ticker is required";
    if (!country_of_domicile) next.country = "Country of domicile is required";
    if (!english_full_name) next.english_name = "English name is required";
    if (!sector_id) next.sector = "Sector is required";
    if (sector_id && !activeSectorIds.has(sector_id)) {
      next.sector = "Sector must be selected from the active sector list";
    }
    if (!isin) next.isin = "ISIN is required";
    if (validAnalysts.length === 0) {
      next.analysts = "At least one analyst is required";
    } else {
      if (!validAnalysts.every((item) => activeAnalystIds.has(item.analyst_id))) {
        next.analysts = "Analyst must be selected from the active analyst list";
      } else if (
        new Set(validAnalysts.map((item) => item.analyst_id)).size !==
        validAnalysts.length
      ) {
        next.analysts = "Analysts must be unique";
      }
    }
    setFormErrors(next);
    if (Object.keys(next).length) return;

    setFormLoading(true);
    const inputData = {
      ticker,
      country_of_domicile,
      english_full_name,
      chinese_short_name: formChineseName.trim() || null,
      traditional_chinese: formTraditionalChinese.trim() || null,
      sector_id,
      isin,
      reporting_currency: formCurrency.trim() || null,
      ads_conversion_factor: formAdsFactor ? parseFloat(formAdsFactor) : null,
      analysts: validAnalysts.map((a, i) => ({ ...a, sort_order: i + 1 })),
    };

    const res = editingCoverage
      ? await updateCoverageAction(editingCoverage.id, inputData)
      : await createCoverageAction(inputData);
    setFormLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setFormOpen(false);
    toast.success(editingCoverage ? "Coverage updated." : "Coverage created.", {
      title: "Success",
    });
    router.refresh();
  }

  function openDelete(coverage: CoverageWithDetails) {
    setDeleteId(coverage.id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteLoading(true);
    const res = await deleteCoverageAction(deleteId);
    setDeleteLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setDeleteOpen(false);
    toast.success("Coverage deleted.", { title: "Success" });
    router.refresh();
  }

  function doSearch() {
    router.push(
      `/coverage${toQueryString({ q: queryDraft, page: 1, sector_id: sectorFilter || undefined })}`,
    );
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    doSearch();
  }

  // Auto-search when filter changes
  function handleSectorChange(value: string) {
    setSectorFilter(value);
    router.push(
      `/coverage${toQueryString({ q: queryDraft, page: 1, sector_id: value || undefined })}`,
    );
  }

  function getSectorName(sectorId: string): string {
    const sector = sectors.find((s) => s.id === sectorId);
    return sector
      ? `${sector.name_en}${sector.name_cn ? ` (${sector.name_cn})` : ""}`
      : "-";
  }

  function getAnalystNames(
    analystList: CoverageWithDetails["analysts"],
  ): string {
    return analystList
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => a.analyst?.full_name ?? "Unknown")
      .join(", ");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">Coverage</div>
          {canCreate ? (
            <Button onClick={openCreate}>Create Coverage</Button>
          ) : (
            <div />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <form className="flex flex-1 gap-4" onSubmit={submitSearch}>
            <div className="w-full max-w-md">
              <Input
                label="Search"
                placeholder="Search by ticker or name"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
              />
            </div>
            <div className="w-60">
              <Select
                label="Sector"
                value={sectorFilter}
                onChange={(e) => handleSectorChange(e.target.value)}
                options={[
                  { value: "", label: "All sectors" },
                  ...sectors.map((s) => ({
                    value: s.id,
                    label: `${s.level === 1 ? "" : "  "}${s.name_en}`,
                  })),
                ]}
              />
            </div>
          </form>
          <div className="hidden text-sm text-[var(--fg-secondary)] sm:block">
            {total} coverages
          </div>
        </div>

        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Ticker</TH>
              <TH>English Name</TH>
              <TH>Sector</TH>
              <TH>Analysts</TH>
              <TH>Updated</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {coverages.length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={6} className="py-10 text-center text-[var(--fg-secondary)]">
                  No coverages found
                </TD>
              </TR>
            ) : (
              coverages.map((coverage) => (
                <TR key={coverage.id}>
                  <TD className="font-mono font-medium text-[var(--fg-primary)]">
                    {coverage.ticker}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {coverage.english_full_name}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {getSectorName(coverage.sector_id)}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {getAnalystNames(coverage.analysts)}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {formatShanghaiYmd(coverage.updated_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <>
                          <ActionButton onClick={() => openEdit(coverage)}>
                            Edit
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            onClick={() => openDelete(coverage)}
                          >
                            Delete
                          </ActionButton>
                        </>
                      )}
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
              `/coverage${toQueryString({ q: queryDraft, page: p, sector_id: sectorFilter || undefined })}`,
            )
          }
        />
      </main>

      <Modal
        open={formOpen}
        title={editingCoverage ? "Edit coverage" : "Create coverage"}
        onClose={() => setFormOpen(false)}
        className="max-w-2xl"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="coverage-form" isLoading={formLoading}>
              {editingCoverage ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="coverage-form" className="space-y-3" onSubmit={submitForm}>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ticker *"
              placeholder="e.g., 700 HK"
              value={formTicker}
              onChange={(e) => setFormTicker(e.target.value)}
              error={formErrors.ticker}
            />
            <Input
              label="ISIN *"
              placeholder="e.g., KYG8441G1045"
              value={formIsin}
              onChange={(e) => setFormIsin(e.target.value)}
              error={formErrors.isin}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Country of Domicile *"
              value={formCountry}
              onChange={(e) => setFormCountry(e.target.value)}
              error={formErrors.country}
              options={[
                { value: "", label: "Select region..." },
                ...regions.map((r) => ({
                  value: r.name_en,
                  label: r.name_en,
                })),
              ]}
            />
            <Input
              label="English Full Name *"
              placeholder="Company full name"
              value={formEnglishName}
              onChange={(e) => setFormEnglishName(e.target.value)}
              error={formErrors.english_name}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Chinese Short Name"
              placeholder="中文名称"
              value={formChineseName}
              onChange={(e) => setFormChineseName(e.target.value)}
            />
            <Input
              label="Traditional Chinese"
              placeholder="繁體中文名稱"
              value={formTraditionalChinese}
              onChange={(e) => setFormTraditionalChinese(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Sector *"
              value={formSectorId}
              onChange={(e) => setFormSectorId(e.target.value)}
              options={[
                { value: "", label: "Select sector..." },
                ...sectors.map((s) => ({
                  value: s.id,
                  label: `${s.level === 1 ? "" : "  "}${s.name_en}`,
                })),
              ]}
              error={formErrors.sector}
            />
            <Input
              label="Reporting Currency"
              placeholder="e.g., HKD"
              value={formCurrency}
              onChange={(e) => setFormCurrency(e.target.value)}
            />
            <Input
              label="ADS Conversion Factor"
              placeholder="e.g., 1"
              type="number"
              step="0.000001"
              value={formAdsFactor}
              onChange={(e) => setFormAdsFactor(e.target.value)}
            />
          </div>

          {/* Analysts section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--fg-secondary)]">
                Analysts * (1-4)
              </label>
              {formAnalysts.length < 4 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addAnalyst}
                  className="text-xs px-2 py-1"
                >
                  + Add Analyst
                </Button>
              )}
            </div>
            {formErrors.analysts && (
              <p className="text-sm text-red-400">{formErrors.analysts}</p>
            )}
            {formAnalysts.map((analyst, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label={index === 0 ? "Analyst" : undefined}
                    value={analyst.analyst_id}
                    onChange={(e) =>
                      updateAnalyst(index, "analyst_id", e.target.value)
                    }
                    options={getAnalystOptions(index)}
                  />
                </div>
                <div className="w-24">
                  <Select
                    label={index === 0 ? "Role" : undefined}
                    value={analyst.role.toString()}
                    onChange={(e) =>
                      updateAnalyst(index, "role", parseInt(e.target.value))
                    }
                    options={[
                      { value: "1", label: "Lead" },
                      { value: "2", label: "2nd" },
                      { value: "3", label: "3rd" },
                      { value: "4", label: "4th" },
                    ]}
                  />
                </div>
                {formAnalysts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeAnalyst(index)}
                    className="mb-0.5 text-xs px-2 py-1"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete coverage?"
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

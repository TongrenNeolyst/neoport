import { Card } from "@/components/ui/card";

const FEATURE_META: Record<string, { label: string; icon: string }> = {
  reports: { label: "Reports", icon: "📝" },
  "new-report": { label: "New Report", icon: "➕" },
  "report-review": { label: "Report Review", icon: "✅" },
  templates: { label: "Templates", icon: "📄" },
  "analyst-info": { label: "Analyst Info", icon: "👥" },
  coverage: { label: "Coverage", icon: "🏢" },
  sectors: { label: "Sectors", icon: "🏗️" },
  regions: { label: "Regions", icon: "🌍" },
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params?.feature;
  const feature = Array.isArray(raw) ? raw[0] : raw;
  const meta = feature ? FEATURE_META[feature] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <div className="text-[64px] leading-none">{meta?.icon ?? "✨"}</div>
        <h1 className="mt-4 text-xl font-semibold text-[var(--fg-primary)]">
          Coming Soon
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-secondary)]">
          This feature is coming soon
        </p>
        {meta ? (
          <p className="mt-6 text-xs text-[var(--fg-tertiary)]">Feature: {meta.label}</p>
        ) : null}
      </Card>
    </div>
  );
}

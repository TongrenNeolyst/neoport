import * as React from "react";

import { listTemplateReportTypesAction, listTemplatesGroupedAction } from "../actions";
import { TemplatesPageClient } from "./templates-page-client";

export async function TemplatesPage() {
  const [groupedResult, reportTypesResult] = await Promise.all([
    listTemplatesGroupedAction(),
    listTemplateReportTypesAction(),
  ]);

  if (!groupedResult.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">Failed to load templates: {groupedResult.error}</p>
      </div>
    );
  }

  const templateGroups = groupedResult.data;
  const reportTypes = reportTypesResult.ok ? reportTypesResult.data : [];

  return <TemplatesPageClient templateGroups={templateGroups} reportTypes={reportTypes} />;
}

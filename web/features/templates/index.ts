/**
 * Templates feature public entry
 *
 * Exports client-safe functions, types, and components.
 * Server-only repo functions are NOT re-exported here.
 */

// Server Actions (client-safe)
export {
  listTemplatesGroupedAction,
  listTemplatesAction,
  getTemplateAction,
  getActiveTemplateAction,
  createTemplateAction,
  activateTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "./actions";

// Types
export type { Template, TemplateGroup, ReportType, FileType } from "./repo/templates-repo";

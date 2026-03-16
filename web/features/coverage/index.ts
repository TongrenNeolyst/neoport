/**
 * Coverage feature public entry
 *
 * Exports client-safe functions, types, and components.
 * Server-only repo functions are NOT re-exported here.
 */

// Server Actions (client-safe)
export {
  listCoveragesAction,
  getCoverageAction,
  createCoverageAction,
  updateCoverageAction,
  deleteCoverageAction,
} from "./actions";

// Types
export type { Coverage, CoverageWithDetails, CoverageAnalyst } from "./repo/coverage-repo";

/**
 * Regions feature public entry
 * 
 * Exports client-safe functions, types, and components.
 * Server-only repo functions are NOT re-exported here.
 */

// Server Actions (client-safe)
export {
  listRegionsAction,
  createRegionAction,
  updateRegionAction,
  deleteRegionAction,
} from "./actions";

// Types
export type { Region } from "./repo/regions-repo";

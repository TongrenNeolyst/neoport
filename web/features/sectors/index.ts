/**
 * Sectors feature public entry
 *
 * Exports client-safe functions, types, and components.
 * Server-only repo functions are NOT re-exported here.
 */

// Server Actions (client-safe)
export {
  listSectorsAction,
  listSectorsGroupedAction,
  listLevel1SectorsAction,
  getSectorAction,
  createSectorAction,
  updateSectorAction,
  deleteSectorAction,
} from "./actions";

// Types
export type { Sector, SectorWithChildren } from "./repo/sectors-repo";

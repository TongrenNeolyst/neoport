// Client-safe exports - can be used in Client Components
export {
  requestPasswordResetAction,
  signInWithPasswordAction,
  signOutAction,
} from "./actions";

// Server-only exports are available from "./server" directly
// Do NOT re-export them here to avoid "server-only" errors in Client Components
// import { getCurrentUser, requireAuth, ... } from "@/features/auth/server";

import "server-only";

export { exchangeCodeForSession, verifyOtp } from "./repo/auth-repo";

// Re-export server-side user utilities for use in Server Components
export { getCurrentUser, getCurrentUserRole, requireAuth, requireAdmin } from "@/lib/supabase/server";

/**
 * Admin Supabase Client
 *
 * 使用 service role key，绕过 RLS
 * 仅用于服务端敏感操作（用户管理、角色变更等）
 *
 * ⚠️ 此模块标记为 server-only，禁止在客户端组件中使用
 *
 * @example
 * import { createAdminClient } from "@/lib/supabase/admin";
 *
 * export async function inviteUser(email: string) {
 *   "use server";
 *   const supabase = createAdminClient();
 *   const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
 *   // ...
 * }
 */

import { createClient } from "@supabase/supabase-js";
import "server-only";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

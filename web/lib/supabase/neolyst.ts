/**
 * Neolyst Supabase Client
 *
 * 用于从 Neolyst 系统数据库获取已发布的报告数据
 * 使用 service role key，绕过 RLS
 *
 * ⚠️ 此模块标记为 server-only，禁止在客户端组件中使用
 */

import { createClient } from "@supabase/supabase-js";
import "server-only";

export function createNeolystClient() {
  return createClient(
    process.env.NEOLYST_SUPABASE_URL!,
    process.env.NEOLYST_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

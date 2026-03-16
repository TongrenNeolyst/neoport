/**
 * Browser Supabase Client
 *
 * 用于客户端组件，只能使用 anon key（RLS 兜底）
 *
 * @example
 * "use client";
 * import { createBrowserClient } from "@/lib/supabase/browser";
 *
 * const supabase = createBrowserClient();
 * const { data } = await supabase.from("users").select("*");
 */

import { createBrowserClient as createClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Server Supabase Client
 *
 * 用于 Server Components、Server Actions、Route Handlers
 * 使用 anon key + cookies 读写，RLS 兜底
 *
 * @example
 * import { createServerClient } from "@/lib/supabase/server";
 *
 * export default async function Page() {
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 */

import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 中调用时可能失败，这是预期行为
            // middleware 会处理 session 刷新
          }
        },
      },
    },
  );
}

/**
 * 获取当前登录用户
 *
 * @returns 用户对象，未登录返回 null
 */
export async function getCurrentUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 获取当前用户角色
 *
 * @returns 角色字符串，未登录返回 null
 */
export async function getCurrentUserRole(): Promise<
  "admin" | "sa" | "analyst" | null
> {
  const user = await getCurrentUser();
  return (user?.app_metadata?.role as "admin" | "sa" | "analyst") ?? null;
}

/**
 * 要求用户已登录，未登录抛出错误
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * 要求用户为管理员，非管理员抛出错误
 */
export async function requireAdmin() {
  const user = await requireAuth();
  const role = user.app_metadata?.role;
  if (role !== "admin") {
    throw new Error("No permission");
  }
  return user;
}

/**
 * 要求用户为管理员或分析师
 */
export async function requireAdminOrAnalyst() {
  const user = await requireAuth();
  const role = user.app_metadata?.role;
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    throw new Error("No permission");
  }
  return user;
}

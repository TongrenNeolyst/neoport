import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Role = "admin" | "sa" | "analyst";

function isAdmin(role: unknown): role is "admin" {
  return role === "admin";
}

function isAdminOrSa(role: unknown): role is "admin" | "sa" {
  return role === "admin" || role === "sa";
}

export async function proxy(request: NextRequest) {
  // Keep a stable list of cookies Supabase wants to set so we can apply them
  // to either a normal response or a redirect response.
  const cookiesToSet: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies) {
          cookiesToSet.push(...nextCookies);
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const role = (user?.app_metadata?.role as Role | undefined) ?? undefined;

  const path = request.nextUrl.pathname;
  const isLogin = path === "/login";
  const isProtected =
    path.startsWith("/desktop") ||
    path.startsWith("/reports") ||
    path.startsWith("/report-review") ||
    path.startsWith("/users") ||
    path.startsWith("/regions") ||
    path.startsWith("/analyst-info");
  const isAdminOnly =
    path.startsWith("/users") ||
    path.startsWith("/regions") ||
    path.startsWith("/analyst-info");
  const isReviewOnly = path.startsWith("/report-review");

  let response: NextResponse;

  if (isProtected && !user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    response = NextResponse.redirect(url);
  } else if (isReviewOnly && user && !isAdminOrSa(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/403";
    url.search = "";
    response = NextResponse.redirect(url);
  } else if (isAdminOnly && user && !isAdmin(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/403";
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - next static files
     * - public static files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

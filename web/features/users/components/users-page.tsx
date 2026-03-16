import { unstable_noStore as noStore } from "next/cache";

import { listUsersAction } from "../actions";
import { UsersPageClient } from "./users-page-client";

export async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  const params = await searchParams;
  const rawQ = params?.q;
  const q = typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? rawQ[0] : "";

  const rawPage = params?.page;
  const pageStr =
    typeof rawPage === "string"
      ? rawPage
      : Array.isArray(rawPage)
        ? rawPage[0]
        : "";
  const page = Math.max(1, Number.parseInt(pageStr || "1", 10) || 1);

  const result = await listUsersAction({ page, query: q || null });

  // If error, show empty state (error handling could be improved)
  const data = result.ok
    ? result.data
    : { items: [], total: 0, page: 1, totalPages: 1 };

  return (
    <UsersPageClient
      items={data.items}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      query={q}
    />
  );
}


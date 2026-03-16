import { UsersPage } from "@/features/users";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function UsersPageRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <UsersPage searchParams={searchParams} />;
}

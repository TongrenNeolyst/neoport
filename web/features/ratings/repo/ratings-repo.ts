import "server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export type Rating = {
  id: string;
  name: string;
  code: string;
  sort: number;
  is_active: boolean;
  created_at: string;
};

/**
 * List all active ratings, sorted by sort field
 */
export async function listAllRatings(): Promise<Result<Rating[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("rating")
    .select("*")
    .eq("is_active", true)
    .order("sort", { ascending: true });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch ratings");

  return ok(data);
}

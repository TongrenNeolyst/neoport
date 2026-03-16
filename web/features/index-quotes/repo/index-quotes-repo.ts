"server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export type IndexQuote = {
  id: string;
  index_code: string;
  index_name: string;
  trade_date: string;
  close_price: number | null;
  created_at: string;
};

export type IndexQuoteInput = {
  index_code: string;
  index_name: string;
  trade_date: string;
  close_price: number | null;
};

/**
 * Upsert an index quote (insert or update if exists)
 */
export async function upsertIndexQuote(
  quote: IndexQuoteInput,
): Promise<Result<IndexQuote>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("index_quotes")
    .upsert(
      {
        index_code: quote.index_code,
        index_name: quote.index_name,
        trade_date: quote.trade_date,
        close_price: quote.close_price,
      },
      {
        onConflict: "index_code,trade_date",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting index quote:", error);
    return err(error.message);
  }

  if (!data) {
    return err("Failed to upsert index quote");
  }

  return ok(data);
}

/**
 * Get an index quote by code and date
 */
export async function getIndexQuote(
  index_code: string,
  trade_date: string,
): Promise<Result<IndexQuote | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("index_quotes")
    .select("*")
    .eq("index_code", index_code)
    .eq("trade_date", trade_date)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return ok(null);
    }
    console.error("Error fetching index quote:", error);
    return err(error.message);
  }

  return ok(data);
}

/**
 * Get the latest index quote for a given index code
 */
export async function getLatestIndexQuote(
  index_code: string,
): Promise<Result<IndexQuote | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("index_quotes")
    .select("*")
    .eq("index_code", index_code)
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return ok(null);
    }
    console.error("Error fetching latest index quote:", error);
    return err(error.message);
  }

  return ok(data);
}

/**
 * List index quotes with filters
 */
export async function listIndexQuotes(params: {
  index_code?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<Result<IndexQuote[]>> {
  const supabase = await createServerClient();

  let query = supabase.from("index_quotes").select("*");

  if (params.index_code) {
    query = query.eq("index_code", params.index_code);
  }
  if (params.start_date) {
    query = query.gte("trade_date", params.start_date);
  }
  if (params.end_date) {
    query = query.lte("trade_date", params.end_date);
  }

  query = query
    .order("trade_date", { ascending: false })
    .limit(params.limit ?? 100);

  const { data, error } = await query;

  if (error) {
    console.error("Error listing index quotes:", error);
    return err(error.message);
  }

  return ok(data ?? []);
}

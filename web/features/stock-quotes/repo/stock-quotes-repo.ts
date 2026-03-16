"server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export type StockQuote = {
  id: string;
  code: string;
  mkt_code: string;
  trade_date: string;
  close_price: number | null;
  volume: number | null;
  market_cap: number | null;
  shares_mn: number | null;
  year_high: number | null;
  year_low: number | null;
  created_at: string;
};

export type StockQuoteInput = {
  code: string;
  mkt_code: string;
  trade_date: string;
  close_price: number | null;
  volume: number | null;
  market_cap: number | null;
  shares_mn: number | null;
  year_high: number | null;
  year_low: number | null;
};

/**
 * Upsert a stock quote (insert or update if exists)
 */
export async function upsertStockQuote(
  quote: StockQuoteInput,
): Promise<Result<StockQuote>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("stock_quotes")
    .upsert(quote, { onConflict: "code,mkt_code,trade_date" })
    .select()
    .single();

  if (error) {
    console.error("Error upserting stock quote:", error);
    return err(error.message);
  }

  if (!data) {
    return err("Failed to upsert stock quote");
  }

  return ok(data);
}

/**
 * Batch upsert stock quotes
 */
export async function upsertStockQuotes(
  quotes: StockQuoteInput[],
): Promise<Result<number>> {
  if (quotes.length === 0) {
    return ok(0);
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("stock_quotes")
    .upsert(quotes, { onConflict: "code,mkt_code,trade_date" });

  if (error) {
    console.error("Error batch upserting stock quotes:", error);
    return err(error.message);
  }

  return ok(quotes.length);
}

/**
 * Get latest stock quote date for a given code and market
 */
export async function getLatestStockQuoteDate(
  code: string,
  mkt_code: string,
): Promise<Result<string | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("stock_quotes")
    .select("trade_date")
    .eq("code", code)
    .eq("mkt_code", mkt_code)
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return ok(null);
    }
    console.error("Error fetching latest stock quote date:", error);
    return err(error.message);
  }

  return ok(data?.trade_date ?? null);
}

/**
 * Get a stock quote by code, market code and date
 */
export async function getStockQuote(
  code: string,
  mkt_code: string,
  trade_date: string,
): Promise<Result<StockQuote | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("stock_quotes")
    .select("*")
    .eq("code", code)
    .eq("mkt_code", mkt_code)
    .eq("trade_date", trade_date)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return ok(null);
    }
    console.error("Error fetching stock quote:", error);
    return err(error.message);
  }

  return ok(data);
}

/**
 * Get the latest stock quote for a given code and market
 */
export async function getLatestStockQuote(
  code: string,
  mkt_code: string,
): Promise<Result<StockQuote | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("stock_quotes")
    .select("*")
    .eq("code", code)
    .eq("mkt_code", mkt_code)
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return ok(null);
    }
    console.error("Error fetching latest stock quote:", error);
    return err(error.message);
  }

  return ok(data);
}

/**
 * List stock quotes with filters
 */
export async function listStockQuotes(params: {
  code?: string;
  mkt_code?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<Result<StockQuote[]>> {
  const supabase = await createServerClient();

  let query = supabase.from("stock_quotes").select("*");

  if (params.code) {
    query = query.eq("code", params.code);
  }
  if (params.mkt_code) {
    query = query.eq("mkt_code", params.mkt_code);
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
    console.error("Error listing stock quotes:", error);
    return err(error.message);
  }

  return ok(data ?? []);
}

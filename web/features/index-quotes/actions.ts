"use server";

import { revalidatePath } from "next/cache";

import { err, ok, type Result } from "@/lib/result";
import { requireAdminOrAnalyst } from "@/lib/supabase/server";

import {
  fetchIndexQuote,
  fetchIndexQuotes,
  type IndexQuoteResult,
} from "@/lib/yfinance-client";
import {
  upsertIndexQuote,
  getLatestIndexQuote,
  listIndexQuotes,
  type IndexQuote,
} from "./repo/index-quotes-repo";

/**
 * Fetch an index quote from yfinance (without saving to database)
 */
export async function fetchIndexQuoteAction(
  index_code: string,
): Promise<Result<IndexQuoteResult>> {
  await requireAdminOrAnalyst();

  if (!index_code) {
    return err("Index code is required");
  }

  const quote = await fetchIndexQuote(index_code);

  if (!quote) {
    return err(`Failed to fetch quote for index ${index_code}`);
  }

  return ok(quote);
}

/**
 * Fetch multiple index quotes from yfinance (without saving to database)
 */
export async function fetchIndexQuotesAction(
  index_codes: string[],
): Promise<Result<IndexQuoteResult[]>> {
  await requireAdminOrAnalyst();

  if (!index_codes || index_codes.length === 0) {
    return err("At least one index code is required");
  }

  const validCodes = index_codes.filter((code) => code);
  if (validCodes.length === 0) {
    return err("No valid index codes provided");
  }

  const quotes = await fetchIndexQuotes(validCodes);

  return ok(quotes);
}

/**
 * Refresh an index quote (fetch from yfinance and save to database)
 */
export async function refreshIndexQuoteAction(
  index_code: string,
): Promise<Result<{ success: boolean; message: string }>> {
  await requireAdminOrAnalyst();

  if (!index_code) {
    return err("Index code is required");
  }

  const quote = await fetchIndexQuote(index_code);

  if (!quote) {
    return err(`Failed to fetch quote for index ${index_code}`);
  }

  const result = await upsertIndexQuote({
    index_code: quote.index_code,
    index_name: quote.index_name,
    trade_date: quote.trade_date,
    close_price: quote.close_price,
  });

  if (!result.ok) {
    return err(`Failed to save quote: ${result.error}`);
  }

  revalidatePath("/index-quotes");

  return ok({
    success: true,
    message: `Successfully refreshed ${quote.index_name} - ${quote.trade_date}`,
  });
}

/**
 * Get the latest index quote from database
 */
export async function getLatestIndexQuoteAction(
  index_code: string,
): Promise<Result<IndexQuote | null>> {
  await requireAdminOrAnalyst();

  if (!index_code) {
    return err("Index code is required");
  }

  return await getLatestIndexQuote(index_code);
}

/**
 * List index quotes from database
 */
export async function listIndexQuotesAction(params?: {
  index_code?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<Result<IndexQuote[]>> {
  await requireAdminOrAnalyst();

  return await listIndexQuotes(params ?? {});
}

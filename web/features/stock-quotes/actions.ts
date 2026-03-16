"use server";

import { revalidatePath } from "next/cache";

import { err, ok, type Result } from "@/lib/result";
import { requireAdminOrAnalyst } from "@/lib/supabase/server";

import {
  fetchStockQuote,
  fetchStockQuotes,
  fetchStockHistory,
  inferMarketCode,
  type StockQuoteResult,
  type MarketCode,
} from "@/lib/yfinance-client";
import {
  upsertStockQuote,
  upsertStockQuotes,
  getLatestStockQuote,
  getLatestStockQuoteDate,
  listStockQuotes,
  type StockQuote,
} from "./repo/stock-quotes-repo";
import { listActiveCoverages } from "@/features/coverage/repo/coverage-repo";

/**
 * Fetch a stock quote from yfinance (without saving to database)
 */
export async function fetchStockQuoteAction(
  code: string,
  mkt_code: string,
): Promise<Result<StockQuoteResult>> {
  await requireAdminOrAnalyst();

  if (!code || !mkt_code) {
    return err("Code and market code are required");
  }

  const validMarkets: MarketCode[] = ["SH", "SZ", "HK", "US"];
  if (!validMarkets.includes(mkt_code as MarketCode)) {
    return err("Invalid market code. Must be SH, SZ, HK, or US");
  }

  const quote = await fetchStockQuote(code, mkt_code as MarketCode);

  if (!quote) {
    return err(`Failed to fetch quote for ${code} (${mkt_code})`);
  }

  return ok(quote);
}

/**
 * Fetch multiple stock quotes from yfinance (without saving to database)
 */
export async function fetchStockQuotesAction(
  inputs: Array<{ code: string; mkt_code: string }>,
): Promise<Result<StockQuoteResult[]>> {
  await requireAdminOrAnalyst();

  if (!inputs || inputs.length === 0) {
    return err("At least one stock input is required");
  }

  const validMarkets: MarketCode[] = ["SH", "SZ", "HK", "US"];
  const filteredInputs = inputs.filter(
    (input): input is { code: string; mkt_code: MarketCode } =>
      !!input.code && validMarkets.includes(input.mkt_code as MarketCode),
  );

  if (filteredInputs.length === 0) {
    return err("No valid stock inputs provided");
  }

  const quotes = await fetchStockQuotes(filteredInputs);

  return ok(quotes);
}

/**
 * Refresh a stock quote (fetch from yfinance and save to database)
 */
export async function refreshStockQuoteAction(
  code: string,
  mkt_code: string,
): Promise<Result<{ success: boolean; message: string }>> {
  await requireAdminOrAnalyst();

  if (!code || !mkt_code) {
    return err("Code and market code are required");
  }

  const validMarkets: MarketCode[] = ["SH", "SZ", "HK", "US"];
  if (!validMarkets.includes(mkt_code as MarketCode)) {
    return err("Invalid market code. Must be SH, SZ, HK, or US");
  }

  const quote = await fetchStockQuote(code, mkt_code as MarketCode);

  if (!quote) {
    return err(`Failed to fetch quote for ${code} (${mkt_code})`);
  }

  const result = await upsertStockQuote({
    code: quote.code,
    mkt_code: quote.mkt_code,
    trade_date: quote.trade_date,
    close_price: quote.close_price,
    volume: quote.volume,
    market_cap: quote.market_cap,
    shares_mn: quote.shares_mn,
    year_high: quote.year_high,
    year_low: quote.year_low,
  });

  if (!result.ok) {
    return err(`Failed to save quote: ${result.error}`);
  }

  revalidatePath("/stock-quotes");

  return ok({
    success: true,
    message: `Successfully refreshed ${code} (${mkt_code}) - ${quote.trade_date}`,
  });
}

/**
 * Get the latest stock quote from database
 */
export async function getLatestStockQuoteAction(
  code: string,
  mkt_code: string,
): Promise<Result<StockQuote | null>> {
  await requireAdminOrAnalyst();

  if (!code || !mkt_code) {
    return err("Code and market code are required");
  }

  return await getLatestStockQuote(code, mkt_code);
}

/**
 * List stock quotes from database
 */
export async function listStockQuotesAction(params?: {
  code?: string;
  mkt_code?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<Result<StockQuote[]>> {
  await requireAdminOrAnalyst();

  return await listStockQuotes(params ?? {});
}

/**
 * Sync stock quotes from coverage table
 * Gets all active coverages and fetches their stock quotes from yfinance
 * - If no existing data: fetches 1 year of history
 * - If has existing data: fetches from latest date to today
 */
export async function syncStockQuotesFromCoverageAction(): Promise<
  Result<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }>
> {
  await requireAdminOrAnalyst();

  // Get all active coverages
  const coverageResult = await listActiveCoverages();
  if (!coverageResult.ok) {
    return err("Failed to fetch coverages: " + coverageResult.error);
  }

  const coverages = coverageResult.data;
  const total = coverages.length;
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process each coverage
  for (const coverage of coverages) {
    try {
      // Infer market code from ticker and country
      const mkt_code = inferMarketCode(
        coverage.ticker,
        coverage.country_of_domicile,
      );

      // Get the clean code
      const cleanCode = coverage.ticker.replace(/\s+(US|HK|SH|SZ)$/i, "").trim();

      // Check existing data in stock_quotes
      const latestDateResult = await getLatestStockQuoteDate(cleanCode, mkt_code);
      const latestDate = latestDateResult.ok ? latestDateResult.data : null;

      const endDate = new Date();
      let startDate: Date;

      if (latestDate) {
        // Has existing data, fetch from latest date to today
        const latest = new Date(latestDate);
        latest.setDate(latest.getDate() + 1); // Add 1 day to avoid fetching same day
        startDate = latest;
      } else {
        // No existing data, fetch 1 year of history
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      // Skip if already up to date
      if (startDate > endDate) {
        success++;
        continue;
      }

      // Fetch historical data from yfinance
      const historicalQuotes = await fetchStockHistory(
        coverage.ticker,
        mkt_code,
        startDate,
        endDate,
      );

      if (historicalQuotes.length === 0) {
        failed++;
        errors.push(`Failed to fetch: ${coverage.ticker} (${mkt_code})`);
        continue;
      }

      // Batch save to database
      const quotesToSave = historicalQuotes.map((q) => ({
        code: q.code,
        mkt_code: q.mkt_code,
        trade_date: q.trade_date,
        close_price: q.close_price,
        volume: q.volume,
        market_cap: q.market_cap,
        shares_mn: q.shares_mn,
        year_high: q.year_high,
        year_low: q.year_low,
      }));

      const saveResult = await upsertStockQuotes(quotesToSave);

      if (!saveResult.ok) {
        failed++;
        errors.push(`Failed to save: ${coverage.ticker} - ${saveResult.error}`);
      } else {
        success++;
      }
    } catch (error) {
      failed++;
      errors.push(
        `Error processing ${coverage.ticker}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  revalidatePath("/stock-quotes");

  return ok({
    total,
    success,
    failed,
    errors,
  });
}

import { createClient } from "@supabase/supabase-js";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

type MarketCode = "SH" | "SZ" | "HK" | "US";

// Extract clean ticker - remove "US", "HK", etc suffix
function extractCleanTicker(ticker: string, mkt_code: MarketCode): string {
  const cleaned = ticker.trim().replace(/\s+(US|HK|SH|SZ)$/i, "").trim();

  // For HK stocks, pad to 4 digits
  if (mkt_code === "HK") {
    return cleaned.padStart(4, "0");
  }

  return cleaned;
}

function inferMarketCode(ticker: string, countryOfDomicile: string): MarketCode {
  const tickerTrimmed = extractCleanTicker(ticker, "US").toUpperCase();

  if (countryOfDomicile === "Hong Kong") return "HK";
  if (countryOfDomicile === "China") {
    if (/^\d{6}$/.test(tickerTrimmed)) {
      return tickerTrimmed.startsWith("6") ? "SH" : "SZ";
    }
    return "SH";
  }
  if (countryOfDomicile === "US") return "US";
  return "US";
}

function getTickerSuffix(mkt_code: MarketCode): string {
  switch (mkt_code) {
    case "SH": return ".SS";
    case "SZ": return ".SZ";
    case "HK": return ".HK";
    default: return "";
  }
}

// Fetch historical data for a given date range
async function fetchHistoricalData(ticker: string, startDate: Date, endDate: Date) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const historical: any[] = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });
    return historical || [];
  } catch (error) {
    console.error(`  Error fetching historical data for ${ticker}:`, error instanceof Error ? error.message : "Unknown");
    return [];
  }
}

// Fetch quote summary (for market cap, shares, 52-week high/low)
async function fetchQuoteSummary(ticker: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quoteSummary: any = await yahooFinance.quoteSummary(ticker, {
      modules: ["summaryDetail", "defaultKeyStatistics"],
    });
    return quoteSummary;
  } catch (error) {
    console.error(`  Error fetching quote summary for ${ticker}:`, error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

async function main() {
  console.log("Starting stock quote sync from coverage...\n");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Get all active coverages
  const { data: coverages, error } = await supabase
    .from("coverage")
    .select("ticker, country_of_domicile")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch coverages:", error);
    return;
  }

  const coverageList = coverages ?? [];
  console.log(`Found ${coverageList.length} active coverages\n`);

  let success = 0;
  let failed = 0;

  for (const coverage of coverageList) {
    const mkt_code = inferMarketCode(coverage.ticker, coverage.country_of_domicile);
    const cleanCode = extractCleanTicker(coverage.ticker, mkt_code);
    const yahooTicker = `${cleanCode}${getTickerSuffix(mkt_code)}`;

    console.log(`Processing ${coverage.ticker} -> ${cleanCode} (${mkt_code})...`);

    try {
      // Check existing data in stock_quotes
      const { data: existingData } = await supabase
        .from("stock_quotes")
        .select("trade_date")
        .eq("code", cleanCode)
        .eq("mkt_code", mkt_code)
        .order("trade_date", { ascending: false })
        .limit(1)
        .single();

      const endDate = new Date();
      let startDate: Date;

      if (existingData) {
        // Has existing data, fetch from latest date to today
        const latestDate = new Date(existingData.trade_date);
        // Add 1 day to avoid fetching the same day again
        latestDate.setDate(latestDate.getDate() + 1);
        startDate = latestDate;
        console.log(`  Existing data found, fetching from ${startDate.toISOString().split('T')[0]} to today`);
      } else {
        // No existing data, fetch last 1 year
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        console.log(`  No existing data, fetching 1 year history`);
      }

      // Don't fetch if startDate is after endDate (already up to date)
      if (startDate > endDate) {
        console.log(`  ✅ Already up to date\n`);
        success++;
        continue;
      }

      // Fetch historical data
      const historical = await fetchHistoricalData(yahooTicker, startDate, endDate);
      const quoteSummary = await fetchQuoteSummary(yahooTicker);

      if (historical.length === 0) {
        console.log(`  ❌ No historical data fetched\n`);
        failed++;
        continue;
      }

      const summaryDetail = quoteSummary?.summaryDetail;
      const keyStatistics = quoteSummary?.defaultKeyStatistics;

      // Prepare batch insert data
      const quotesToInsert = historical.map((day) => ({
        code: cleanCode,
        mkt_code,
        trade_date: day.date.toISOString().split("T")[0],
        close_price: day.close,
        volume: day.volume ?? null,
        market_cap: summaryDetail?.marketCap ? Number(summaryDetail.marketCap) / 1e9 : null,
        shares_mn: keyStatistics?.sharesOutstanding ? Number(keyStatistics.sharesOutstanding) / 1e6 : null,
        year_high: summaryDetail?.fiftyTwoWeekHigh ?? null,
        year_low: summaryDetail?.fiftyTwoWeekLow ?? null,
      }));

      // Batch upsert
      const { error: upsertError } = await supabase
        .from("stock_quotes")
        .upsert(quotesToInsert, { onConflict: "code,mkt_code,trade_date" });

      if (upsertError) {
        console.log(`  ❌ Failed to save: ${upsertError.message}\n`);
        failed++;
      } else {
        console.log(`  ✅ Saved ${quotesToInsert.length} records (${quotesToInsert[0].trade_date} to ${quotesToInsert[quotesToInsert.length - 1].trade_date})\n`);
        success++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err instanceof Error ? err.message : "Unknown"}\n`);
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log("=== Sync Complete ===");
  console.log(`Total: ${coverageList.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

main();

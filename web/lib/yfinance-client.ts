"server-only";

import yahooFinance from "yahoo-finance2";

export type MarketCode = "SH" | "SZ" | "HK" | "US";

export interface StockQuoteInput {
  code: string;
  mkt_code: MarketCode;
}

export interface StockQuoteResult {
  code: string;
  mkt_code: string;
  trade_date: string;
  close_price: number | null;
  volume: number | null;
  market_cap: number | null;
  shares_mn: number | null;
  year_high: number | null;
  year_low: number | null;
}

export interface IndexQuoteResult {
  index_code: string;
  index_name: string;
  trade_date: string;
  close_price: number | null;
}

// Map market code to yahoo finance ticker suffix
function getTickerSuffix(mkt_code: MarketCode): string {
  switch (mkt_code) {
    case "SH":
      return ".SS"; // Shanghai Stock Exchange
    case "SZ":
      return ".SZ"; // Shenzhen Stock Exchange
    case "HK":
      return ".HK"; // Hong Kong Stock Exchange
    case "US":
      return ""; // US stocks
    default:
      return "";
  }
}

// Convert stock code to yahoo finance ticker
export function getStockTicker(code: string, mkt_code: MarketCode): string {
  const cleanCode = extractCleanTicker(code, mkt_code);
  return `${cleanCode}${getTickerSuffix(mkt_code)}`;
}

/**
 * Extract clean ticker from a ticker string that may contain suffix
 * e.g., "VST US" -> "VST", "700 HK" -> "700", "600519" -> "600519"
 * For HK stocks, pads to 4 digits: "700" -> "0700"
 */
export function extractCleanTicker(ticker: string, mkt_code?: MarketCode): string {
  // Remove common suffixes like "US", "HK", "SH", "SZ"
  let cleaned = ticker.trim().replace(/\s+(US|HK|SH|SZ)$/i, "").trim();

  // For HK stocks, pad to 4 digits
  if (mkt_code === "HK") {
    cleaned = cleaned.padStart(4, "0");
  }

  return cleaned;
}

/**
 * Infer market code from ticker and country of domicile
 * - China + 6 digit ticker starting with 6 -> Shanghai (SH)
 * - China + 6 digit ticker starting with 0/3 -> Shenzhen (SZ)
 * - Hong Kong -> HK
 * - US -> US
 * - Other -> US (default)
 */
export function inferMarketCode(
  ticker: string,
  countryOfDomicile: string,
): MarketCode {
  const tickerTrimmed = extractCleanTicker(ticker).toUpperCase();

  if (countryOfDomicile === "Hong Kong") {
    return "HK";
  }

  if (countryOfDomicile === "China") {
    // A shares: 6 digits
    if (/^\d{6}$/.test(tickerTrimmed)) {
      // Shanghai: starts with 6
      if (tickerTrimmed.startsWith("6")) {
        return "SH";
      }
      // Shenzhen: starts with 0 or 3
      if (tickerTrimmed.startsWith("0") || tickerTrimmed.startsWith("3")) {
        return "SZ";
      }
      // Default to Shanghai for other patterns
      return "SH";
    }
    // Default to Shanghai for China
    return "SH";
  }

  if (countryOfDomicile === "US") {
    return "US";
  }

  // Default to US for other countries
  return "US";
}

// Index code to yahoo finance ticker mapping
const INDEX_TICKER_MAP: Record<string, string> = {
  SSEC: "^SSEC", // 上证指数
  SZSE: "^SZSE", // 深证成指
  HSI: "^HSI", // 恒生指数
  GSPC: "^GSPC", // 标普 500
  DJI: "^DJI", // 道琼斯
  IXIC: "^IXIC", // 纳斯达克
};

export function getIndexTicker(indexCode: string): string {
  return INDEX_TICKER_MAP[indexCode] || indexCode;
}

export function getIndexCodeFromTicker(ticker: string): string | null {
  for (const [code, t] of Object.entries(INDEX_TICKER_MAP)) {
    if (t === ticker) return code;
  }
  return null;
}

/**
 * Fetch stock quote from yahoo finance
 */
export async function fetchStockQuote(
  code: string,
  mkt_code: MarketCode,
): Promise<StockQuoteResult | null> {
  const ticker = getStockTicker(code, mkt_code);

  try {
    // Get quote summary for basic info
    const quoteSummary: any = await yahooFinance.quoteSummary(ticker, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics"],
    });

    // Get historical data for the last trading day
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days to ensure we get the latest trading day

    const historical: any[] = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (!historical || historical.length === 0) {
      return null;
    }

    // Get the most recent trading day data
    const latestData = historical[historical.length - 1];

    // Extract data from quote summary
    const price = quoteSummary.price;
    const summaryDetail = quoteSummary.summaryDetail;
    const keyStatistics = quoteSummary.defaultKeyStatistics;

    return {
      code,
      mkt_code,
      trade_date: latestData.date.toISOString().split("T")[0],
      close_price: latestData.close,
      volume: latestData.volume ?? null,
      market_cap: summaryDetail?.marketCap
        ? Number(summaryDetail.marketCap) / 1e9
        : null, // Convert to billions
      shares_mn: keyStatistics?.sharesOutstanding
        ? Number(keyStatistics.sharesOutstanding) / 1e6
        : null, // Convert to millions
      year_high: summaryDetail?.fiftyTwoWeekHigh ?? null,
      year_low: summaryDetail?.fiftyTwoWeekLow ?? null,
    };
  } catch (error) {
    console.error(`Error fetching stock quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch stock historical data from yahoo finance
 * Returns array of daily quotes for a date range
 */
export async function fetchStockHistory(
  code: string,
  mkt_code: MarketCode,
  startDate: Date,
  endDate: Date,
): Promise<StockQuoteResult[]> {
  const ticker = getStockTicker(code, mkt_code);

  try {
    // Get quote summary for basic info (shared across all days)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quoteSummary: any = await yahooFinance.quoteSummary(ticker, {
      modules: ["summaryDetail", "defaultKeyStatistics"],
    });

    const summaryDetail = quoteSummary?.summaryDetail;
    const keyStatistics = quoteSummary?.defaultKeyStatistics;

    // Get historical data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const historical: any[] = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (!historical || historical.length === 0) {
      return [];
    }

    const cleanCode = extractCleanTicker(code, mkt_code);

    return historical.map((day) => ({
      code: cleanCode,
      mkt_code,
      trade_date: day.date.toISOString().split("T")[0],
      close_price: day.close,
      volume: day.volume ?? null,
      market_cap: summaryDetail?.marketCap
        ? Number(summaryDetail.marketCap) / 1e9
        : null,
      shares_mn: keyStatistics?.sharesOutstanding
        ? Number(keyStatistics.sharesOutstanding) / 1e6
        : null,
      year_high: summaryDetail?.fiftyTwoWeekHigh ?? null,
      year_low: summaryDetail?.fiftyTwoWeekLow ?? null,
    }));
  } catch (error) {
    console.error(`Error fetching stock history for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetch index quote from yahoo finance
 */
export async function fetchIndexQuote(
  indexCode: string,
): Promise<IndexQuoteResult | null> {
  const ticker = getIndexTicker(indexCode);

  try {
    // Get quote summary
    const quoteSummary: any = await yahooFinance.quoteSummary(ticker, {
      modules: ["price"],
    });

    // Get historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const historical: any[] = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (!historical || historical.length === 0) {
      return null;
    }

    const latestData = historical[historical.length - 1];
    const price = quoteSummary.price;

    return {
      index_code: indexCode,
      index_name: price.shortName || price.longName || indexCode,
      trade_date: latestData.date.toISOString().split("T")[0],
      close_price: latestData.close,
    };
  } catch (error) {
    console.error(`Error fetching index quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stock quotes
 */
export async function fetchStockQuotes(
  inputs: StockQuoteInput[],
): Promise<StockQuoteResult[]> {
  const results = await Promise.all(
    inputs.map((input) => fetchStockQuote(input.code, input.mkt_code)),
  );
  return results.filter((r): r is StockQuoteResult => r !== null);
}

/**
 * Fetch multiple index quotes
 */
export async function fetchIndexQuotes(
  indexCodes: string[],
): Promise<IndexQuoteResult[]> {
  const results = await Promise.all(
    indexCodes.map((code) => fetchIndexQuote(code)),
  );
  return results.filter((r): r is IndexQuoteResult => r !== null);
}

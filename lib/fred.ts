import { getSetting, setSetting } from "./db";

const FRED_SERIES = "FEDFUNDS";
const CACHE_TTL_DAYS = 7;

export type FedRateResult = {
  rate: number;
  cachedDate: string;
  source: "FRED" | "cache";
};

export async function getFedRate(): Promise<FedRateResult> {
  const cachedRate = await getSetting("fed_rate_cache");
  const cachedDate = await getSetting("fed_rate_cache_date");

  const isStale = !cachedDate || isDaysOld(cachedDate, CACHE_TTL_DAYS);

  if (!isStale && cachedRate) {
    return { rate: parseFloat(cachedRate), cachedDate: cachedDate!, source: "cache" };
  }

  // Try to fetch fresh rate from FRED
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) throw new Error("FRED_API_KEY not set");

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${FRED_SERIES}&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`FRED API returned ${res.status}`);

    const data = await res.json();
    const latestObs = data.observations?.[0];
    if (!latestObs || latestObs.value === ".") throw new Error("No valid observation");

    const rate = parseFloat(latestObs.value);
    const today = new Date().toISOString().split("T")[0];

    await setSetting("fed_rate_cache", String(rate));
    await setSetting("fed_rate_cache_date", today);

    return { rate, cachedDate: today, source: "FRED" };
  } catch (err) {
    console.error("FRED fetch failed, using cache:", err);
    // Fall back to whatever is cached
    const fallbackRate = cachedRate ? parseFloat(cachedRate) : 4.33;
    const fallbackDate = cachedDate ?? new Date().toISOString().split("T")[0];
    return { rate: fallbackRate, cachedDate: fallbackDate, source: "cache" };
  }
}

function isDaysOld(dateStr: string, days: number): boolean {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24) >= days;
}

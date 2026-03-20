/**
 * FRED (Federal Reserve Economic Data) API client.
 * Free API — register at fred.stlouisfed.org to get a key.
 * Env var: FRED_API_KEY
 *
 * Series used:
 *   MORTGAGE30US — 30-year fixed-rate mortgage average (%)
 *   HOUST        — Housing starts (thousands of units, SAAR)
 *   CSUSHPINSA   — Case-Shiller home price index (national)
 *   UNRATE       — Unemployment rate (%)
 *   MSPUS        — Median sales price of houses sold ($)
 *   PERMIT       — New privately-owned housing units authorized (thousands)
 */

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export interface FredSeries {
  seriesId: string;
  value: number;
  prevValue: number | null;
  date: string;
  unit: string;
  label: string; // human-readable name for prompt injection
}

const SERIES_META: Record<string, { unit: string; label: string }> = {
  MORTGAGE30US: { unit: 'Percent', label: '30-year fixed mortgage rate' },
  HOUST:        { unit: 'Thousands of Units (SAAR)', label: 'Housing starts' },
  CSUSHPINSA:   { unit: 'Index', label: 'Case-Shiller home price index' },
  UNRATE:       { unit: 'Percent', label: 'US unemployment rate' },
  MSPUS:        { unit: 'Dollars', label: 'Median home sale price' },
  PERMIT:       { unit: 'Thousands of Units', label: 'New housing permits' },
};

export const FRED_SERIES_IDS = Object.keys(SERIES_META);

async function fetchSeries(seriesId: string, apiKey: string): Promise<FredSeries | null> {
  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('limit', '2');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('file_type', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.warn(`[fredClient] ${seriesId} fetch failed: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as {
    observations: Array<{ date: string; value: string }>;
  };

  const obs = data.observations ?? [];
  if (obs.length === 0) return null;

  const latest = obs[0];
  const prev = obs[1];

  const value = parseFloat(latest.value);
  if (isNaN(value)) return null;

  const prevValue = prev ? parseFloat(prev.value) : null;
  const meta = SERIES_META[seriesId] ?? { unit: '', label: seriesId };

  return {
    seriesId,
    value,
    prevValue: prevValue !== null && !isNaN(prevValue) ? prevValue : null,
    date: latest.date,
    unit: meta.unit,
    label: meta.label,
  };
}

export interface MarketDataSnapshot {
  series: FredSeries[];
  fetchedAt: Date;
}

export async function fetchAllMarketData(): Promise<MarketDataSnapshot> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn('[fredClient] FRED_API_KEY not set — skipping market data fetch');
    return { series: [], fetchedAt: new Date() };
  }

  const results = await Promise.allSettled(
    FRED_SERIES_IDS.map((id) => fetchSeries(id, apiKey)),
  );

  const series: FredSeries[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      series.push(result.value);
    }
  }

  return { series, fetchedAt: new Date() };
}

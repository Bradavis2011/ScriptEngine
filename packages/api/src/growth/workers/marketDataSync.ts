/**
 * Market Data Sync Worker — daily 5 AM UTC
 *
 * Fetches all configured FRED series and upserts into MarketDataCache.
 * This data is then available to marketContext.ts for injection into
 * data-heavy script types (data_drop, market_update, trend_take, just_listed).
 *
 * Env var: FRED_API_KEY (free at fred.stlouisfed.org)
 */

import { Job } from 'bullmq';
import { fetchAllMarketData } from '../services/fredClient';
import { prisma } from '../../lib/prisma';

export async function runMarketDataSync(_job: Job): Promise<void> {
  console.log('[marketDataSync] Fetching FRED market data...');

  if (!process.env.FRED_API_KEY) {
    console.warn('[marketDataSync] FRED_API_KEY not set — skipping');
    return;
  }

  const snapshot = await fetchAllMarketData();

  if (snapshot.series.length === 0) {
    console.warn('[marketDataSync] No FRED series returned');
    return;
  }

  let upserted = 0;
  for (const s of snapshot.series) {
    await prisma.marketDataCache.upsert({
      where: { seriesId: s.seriesId },
      update: {
        value: s.value,
        prevValue: s.prevValue,
        date: s.date,
        unit: s.unit,
      },
      create: {
        seriesId: s.seriesId,
        value: s.value,
        prevValue: s.prevValue,
        date: s.date,
        unit: s.unit ?? '',
      },
    });
    upserted++;
  }

  console.log(`[marketDataSync] Done — ${upserted} FRED series upserted`);
}

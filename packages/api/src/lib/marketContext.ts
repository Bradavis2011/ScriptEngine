/**
 * Market context builder — injects real, verifiable data into Gemini prompts.
 *
 * Universal layer (all niches): TopicSuggestion table (trending topics + news quotes)
 * Niche-specific layer (opt-in): FRED data for real estate / finance niches
 *
 * Returns a formatted string prepended to additionalContext in generateScript().
 * Only applied for data-heavy script types: data_drop, market_update, trend_take, just_listed
 */

import { prisma } from './prisma';

// Niches that get FRED economic data injected
const REAL_DATA_NICHES = new Set([
  'real estate',
  'real estate investing',
  'finance',
  'personal finance',
  'mortgage',
  'housing',
  'investment',
]);

function matchesRealDataNiche(niche: string): boolean {
  const lower = niche.toLowerCase();
  for (const keyword of REAL_DATA_NICHES) {
    if (lower.includes(keyword)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Universal layer: TopicSuggestion table
// ---------------------------------------------------------------------------

async function getUniversalContext(niche: string): Promise<string> {
  const suggestions = await prisma.topicSuggestion.findMany({
    where: {
      niche,
      expiresAt: { gt: new Date() },
    },
    orderBy: { relevanceScore: 'desc' },
    take: 3,
  });

  if (suggestions.length === 0) return '';

  const lines = suggestions.map(
    (s) => `- [${s.source.toUpperCase()}] ${s.contextSnippet}`,
  );
  return `TRENDING SIGNALS FOR ${niche.toUpperCase()}:\n${lines.join('\n')}`;
}

// ---------------------------------------------------------------------------
// FRED layer: real estate / finance niches
// ---------------------------------------------------------------------------

async function getFredContext(): Promise<string> {
  const cached = await prisma.marketDataCache.findMany();
  if (cached.length === 0) return '';

  const lines = cached.map((c) => {
    const change =
      c.prevValue !== null
        ? ` (prev: ${c.prevValue.toFixed(2)})`
        : '';
    return `- ${c.seriesId}: ${c.value.toFixed(2)}${c.unit ? ` ${c.unit}` : ''}${change} as of ${c.date}`;
  });

  return `VERIFIED FRED ECONOMIC DATA (cite these exact figures, do not fabricate or approximate):\n${lines.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Main entrypoint
// ---------------------------------------------------------------------------

export async function buildMarketContext(niche: string, _city?: string): Promise<string> {
  const parts: string[] = [];

  const [universalCtx, fredCtx] = await Promise.all([
    getUniversalContext(niche),
    matchesRealDataNiche(niche) ? getFredContext() : Promise.resolve(''),
  ]);

  if (universalCtx) parts.push(universalCtx);
  if (fredCtx) parts.push(fredCtx);

  if (parts.length === 0) return '';

  return (
    `VERIFIED REAL-TIME DATA — cite these exact figures and signals, do not fabricate:\n\n` +
    parts.join('\n\n')
  );
}

// Script types that benefit from market data injection
export const DATA_HEAVY_SCRIPT_TYPES = new Set([
  'data_drop',
  'market_update',
  'trend_take',
  'just_listed',
]);

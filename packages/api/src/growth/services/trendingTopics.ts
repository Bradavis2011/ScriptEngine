/**
 * Unified topic discovery service.
 * Aggregates signals from 4 free sources, deduplicates, and scores them.
 *
 * Sources:
 *   1. Reddit pain points — existing PainPoint table (score >= 7, last 7 days)
 *   2. YouTube trending  — existing research.ts fetchYouTubeInsights logic
 *   3. NewsAPI           — NEWSAPI_KEY env var (100 req/day free at newsapi.org)
 *   4. Google Trends     — google-trends-api npm package (unofficial, graceful fallback)
 */

import { prisma } from '../../lib/prisma';
import { fetchYouTubeInsights } from '../../lib/research';

export interface TopicSuggestionInput {
  niche: string;
  topic: string;
  source: 'google_trends' | 'reddit' | 'youtube' | 'newsapi';
  sourceUrl?: string;
  scriptType: string;
  contextSnippet: string;
  relevanceScore: number;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Source 1: Reddit pain points from existing PainPoint table
// ---------------------------------------------------------------------------

async function discoverFromReddit(niche: string): Promise<TopicSuggestionInput[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const painPoints = await prisma.painPoint.findMany({
    where: {
      overallScore: { gte: 7 },
      discoveredAt: { gte: sevenDaysAgo },
    },
    orderBy: { overallScore: 'desc' },
    take: 10,
  });

  return painPoints.map((p) => ({
    niche,
    topic: p.title ?? p.body.slice(0, 80),
    source: 'reddit' as const,
    sourceUrl: p.sourceUrl,
    scriptType: 'niche_tip', // pain points → practical tips
    contextSnippet: `Reddit pain point (score ${p.overallScore.toFixed(1)}/10): "${p.body.slice(0, 300)}"${p.marketingAngle ? ` Angle: ${p.marketingAngle}` : ''}`,
    relevanceScore: Math.min(p.overallScore / 10, 1),
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
  }));
}

// ---------------------------------------------------------------------------
// Source 2: YouTube trending via existing research service
// ---------------------------------------------------------------------------

async function discoverFromYouTube(niche: string): Promise<TopicSuggestionInput[]> {
  if (!process.env.YOUTUBE_API_KEY) return [];

  try {
    const insights = await fetchYouTubeInsights(niche, niche);
    const results: TopicSuggestionInput[] = [];

    for (const video of insights.topVideos.slice(0, 5)) {
      const viewCount = parseInt(video.viewCount, 10);
      const viewsM = (viewCount / 1_000_000).toFixed(1);
      results.push({
        niche,
        topic: video.title,
        source: 'youtube' as const,
        scriptType: 'quick_hook',
        contextSnippet: `Top YouTube video in this niche: "${video.title}" by ${video.channelTitle} — ${viewsM}M views. Consider a take on this angle.`,
        relevanceScore: Math.min(viewCount / 5_000_000, 1),
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      });
    }
    return results;
  } catch (err) {
    console.warn('[trendingTopics] YouTube discovery failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source 3: NewsAPI
// ---------------------------------------------------------------------------

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

async function discoverFromNews(niche: string): Promise<TopicSuggestionInput[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  // Map niche to news-friendly search query
  const query = encodeURIComponent(niche.split('&')[0].trim());

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${apiKey}`,
    );
    if (!res.ok) {
      console.warn(`[trendingTopics] NewsAPI failed: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { articles?: NewsArticle[] };
    const articles = data.articles ?? [];

    return articles
      .filter((a) => a.title && a.title !== '[Removed]')
      .map((a) => ({
        niche,
        topic: a.title,
        source: 'newsapi' as const,
        sourceUrl: a.url,
        scriptType: 'data_drop',
        contextSnippet: `Breaking news in this niche: "${a.title}"${a.description ? `. ${a.description}` : ''}`,
        relevanceScore: 0.7,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      }));
  } catch (err) {
    console.warn('[trendingTopics] NewsAPI discovery failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source 4: Google Trends (unofficial API — graceful fallback)
// ---------------------------------------------------------------------------

async function discoverFromGoogleTrends(niche: string): Promise<TopicSuggestionInput[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const googleTrends = require('google-trends-api') as {
      relatedTopics: (opts: object) => Promise<string>;
    };

    const keyword = niche.split('&')[0].trim();
    const raw = await googleTrends.relatedTopics({
      keyword,
      startTime: new Date(Date.now() - 7 * 24 * 3600 * 1000),
    });

    const parsed = JSON.parse(raw) as {
      default?: {
        rankedList?: Array<{
          rankedKeyword?: Array<{ topic?: { title: string }; value: number }>;
        }>;
      };
    };

    const topics =
      parsed?.default?.rankedList?.[0]?.rankedKeyword
        ?.filter((k) => k.topic?.title)
        .slice(0, 5) ?? [];

    return topics.map((t) => ({
      niche,
      topic: t.topic!.title,
      source: 'google_trends' as const,
      scriptType: 'trend_take',
      contextSnippet: `Google Trends: "${t.topic!.title}" is trending in the ${niche} space this week (breakout score: ${t.value}).`,
      relevanceScore: Math.min(t.value / 100, 1),
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    }));
  } catch (err) {
    // google-trends-api is unofficial — rate limits / blocking are common
    console.warn('[trendingTopics] Google Trends discovery failed (expected occasionally):', err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Deduplication: drop suggestions whose topic is too similar to existing ones
// ---------------------------------------------------------------------------

function deduplicate(suggestions: TopicSuggestionInput[]): TopicSuggestionInput[] {
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = s.topic.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Main entrypoint
// ---------------------------------------------------------------------------

export async function discoverTrendingTopics(niche: string): Promise<TopicSuggestionInput[]> {
  const [reddit, youtube, news, trends] = await Promise.all([
    discoverFromReddit(niche),
    discoverFromYouTube(niche),
    discoverFromNews(niche),
    discoverFromGoogleTrends(niche),
  ]);

  const all = [...reddit, ...youtube, ...news, ...trends];
  const deduped = deduplicate(all);

  // Sort by relevance descending
  return deduped.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Expire old suggestions — delete rows past their expiry.
 * Called by the topicDiscovery worker before inserting new ones.
 */
export async function expireOldSuggestions(): Promise<number> {
  const result = await prisma.topicSuggestion.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

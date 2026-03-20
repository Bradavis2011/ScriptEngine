/**
 * Topic Discovery Worker — every 6 hours
 *
 * Discovers trending topics from 4 free data sources (Reddit pain points,
 * YouTube, NewsAPI, Google Trends) and upserts them into TopicSuggestion.
 *
 * Runs for each distinct niche that has at least one active tenant.
 * Suggestions expire after 48h (enforced by expireOldSuggestions).
 */

import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';
import { discoverTrendingTopics, expireOldSuggestions } from '../services/trendingTopics';

export async function runTopicDiscovery(_job: Job): Promise<void> {
  console.log('[topicDiscovery] Starting topic discovery run...');

  // Expire stale suggestions first
  const expired = await expireOldSuggestions();
  if (expired > 0) console.log(`[topicDiscovery] Expired ${expired} stale suggestions`);

  // Get distinct niches from active tenants
  const tenants = await prisma.tenant.groupBy({
    by: ['niche'],
    _count: { id: true },
  });

  const niches = tenants.map((t) => t.niche).filter(Boolean);
  console.log(`[topicDiscovery] Discovering topics for ${niches.length} niches`);

  let totalCreated = 0;

  for (const niche of niches) {
    try {
      const suggestions = await discoverTrendingTopics(niche);
      console.log(`[topicDiscovery] ${niche}: ${suggestions.length} topics found`);

      for (const s of suggestions) {
        // Upsert on unique key (niche, source, topic) — atomic, safe for concurrent runs
        const result = await prisma.topicSuggestion.upsert({
          where: { niche_source_topic: { niche: s.niche, source: s.source, topic: s.topic } },
          update: {
            contextSnippet: s.contextSnippet,
            relevanceScore: s.relevanceScore,
            expiresAt: s.expiresAt,
            sourceUrl: s.sourceUrl,
          },
          create: {
            niche: s.niche,
            topic: s.topic,
            source: s.source,
            sourceUrl: s.sourceUrl,
            scriptType: s.scriptType,
            contextSnippet: s.contextSnippet,
            relevanceScore: s.relevanceScore,
            expiresAt: s.expiresAt,
          },
          select: { id: true, createdAt: true },
        });
        // Count as created if very recent (upsert doesn't expose wasCreated)
        const ageMs = Date.now() - result.createdAt.getTime();
        if (ageMs < 5000) totalCreated++;
      }
    } catch (err) {
      console.error(
        `[topicDiscovery] Failed for niche "${niche}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`[topicDiscovery] Done — ${totalCreated} new suggestions created`);
}

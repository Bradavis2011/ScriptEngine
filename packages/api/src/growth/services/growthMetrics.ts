import { prisma } from '../../lib/prisma';

export interface GrowthDashboard {
  reddit: {
    totalDiscovered: number;
    queued: number;
    commented: number;
    skipped: number;
    failed: number;
    avgKarma: number | null;
    authorReplyRate: number | null;
  };
  creators: {
    totalDiscovered: number;
    briefed: number;
    contacted: number;
    responded: number;
    converted: number;
  };
  painPoints: {
    totalDiscovered: number;
    avgOverallScore: number | null;
    topCategories: string[];
  };
  templates: {
    current: number;
    challengers: number;
  };
  seo: {
    totalPublished: number;
    totalQueued: number;
    painPointGenerated: number;
    pagesRefreshedLast24h: number;
    pagesGeneratedLast24h: number;
  };
  recentEvents: Array<{
    id: string;
    channel: string;
    eventType: string;
    createdAt: Date;
  }>;
}

export async function getGrowthDashboard(): Promise<GrowthDashboard> {
  const yesterday = new Date(Date.now() - 24 * 3600_000);

  const [
    redditByStatus,
    redditKarmaStats,
    creatorsByStatus,
    painPointStats,
    templateStats,
    recentEvents,
    authorRepliedCount,
    seoByStatus,
    painPointPageCount,
    recentRefreshed,
    recentGenerated,
  ] = await Promise.all([
    prisma.redditThread.groupBy({ by: ['status'], _count: true }),
    prisma.redditThread.aggregate({
      where: { status: 'commented', commentKarma: { not: null } },
      _avg: { commentKarma: true },
    }),
    prisma.creatorProspect.groupBy({ by: ['status'], _count: true }),
    prisma.painPoint.aggregate({
      _count: true,
      _avg: { overallScore: true },
    }),
    prisma.growthTemplate.groupBy({ by: ['status'], _count: true }),
    prisma.growthEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, channel: true, eventType: true, createdAt: true },
    }),
    prisma.redditThread.count({ where: { status: 'commented', authorReplied: true } }),
    prisma.seoPage.groupBy({ by: ['status'], _count: true }),
    prisma.seoPage.count({ where: { pageType: 'pain_point' } }),
    prisma.seoPage.count({
      where: { refreshedAt: { gte: yesterday } },
    }),
    prisma.seoPage.count({
      where: { publishedAt: { gte: yesterday }, pageType: { in: ['pain_point', 'howto'] } },
    }),
  ]);

  // Top categories from highest-scoring pain points
  const painPointsWithCategories = await prisma.painPoint.findMany({
    select: { categories: true },
    orderBy: { overallScore: 'desc' },
    take: 100,
  });
  const catCounts: Record<string, number> = {};
  for (const p of painPointsWithCategories) {
    for (const cat of p.categories) {
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }
  }
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const redditCount = (s: string) =>
    redditByStatus.find((r) => r.status === s)?._count ?? 0;
  const creatorCount = (s: string) =>
    creatorsByStatus.find((r) => r.status === s)?._count ?? 0;
  const seoCount = (s: string) =>
    seoByStatus.find((r) => r.status === s)?._count ?? 0;
  const commentedCount = redditCount('commented');

  return {
    reddit: {
      totalDiscovered: redditByStatus.reduce((sum, r) => sum + r._count, 0),
      queued: redditCount('queued'),
      commented: commentedCount,
      skipped: redditCount('skipped'),
      failed: redditCount('failed'),
      avgKarma: redditKarmaStats._avg.commentKarma,
      authorReplyRate:
        commentedCount > 0 ? authorRepliedCount / commentedCount : null,
    },
    creators: {
      totalDiscovered: creatorsByStatus.reduce((sum, r) => sum + r._count, 0),
      briefed: creatorCount('briefed'),
      contacted: creatorCount('contacted'),
      responded: creatorCount('responded'),
      converted: creatorCount('converted'),
    },
    painPoints: {
      totalDiscovered: painPointStats._count,
      avgOverallScore: painPointStats._avg.overallScore,
      topCategories,
    },
    templates: {
      current: templateStats.find((t) => t.status === 'current')?._count ?? 0,
      challengers: templateStats.find((t) => t.status === 'challenger')?._count ?? 0,
    },
    seo: {
      totalPublished: seoCount('published'),
      totalQueued: seoCount('queued'),
      painPointGenerated: painPointPageCount,
      pagesRefreshedLast24h: recentRefreshed,
      pagesGeneratedLast24h: recentGenerated,
    },
    recentEvents,
  };
}

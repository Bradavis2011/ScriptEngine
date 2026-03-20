import { prisma } from '../../lib/prisma';
import { getGrowthDashboard } from './growthMetrics';

export async function buildDailyBriefHtml(): Promise<string> {
  const dashboard = await getGrowthDashboard();
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);

  const [topPainPoints, topCreators, outreachStats, topSuggestions] = await Promise.all([
    prisma.painPoint.findMany({
      where: { discoveredAt: { gte: yesterday } },
      orderBy: { overallScore: 'desc' },
      take: 5,
    }),
    prisma.creatorProspect.findMany({
      where: { status: 'briefed', discoveredAt: { gte: yesterday } },
      orderBy: { relevanceScore: 'desc' },
      take: 5,
    }),
    prisma.creatorProspect.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { status: { in: ['contacted', 'responded', 'converted'] } },
    }),
    prisma.topicSuggestion.findMany({
      where: { expiresAt: { gt: new Date() }, avgPerformance: { not: null } },
      orderBy: { avgPerformance: 'desc' },
      take: 3,
    }),
  ]);

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const painPointsSection =
    topPainPoints.length > 0
      ? `<div class="card">
      <div class="label">Top Pain Points — Last 24h</div>
      ${topPainPoints
        .map(
          (p) => `
        <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #2A2A2F;">
          <p style="color:#e5e5e7;font-weight:600;margin:0 0 4px;">${p.title ?? p.body.slice(0, 80)}</p>
          <p style="margin:2px 0;">Score: ${p.overallScore.toFixed(1)} | ${p.categories.join(', ')}</p>
          ${p.marketingAngle ? `<p style="color:#7C3AED;margin:2px 0;">${p.marketingAngle}</p>` : ''}
        </div>`,
        )
        .join('')}
    </div>`
      : '';

  const creatorsSection =
    topCreators.length > 0
      ? `<div class="card">
      <div class="label">New Creator Prospects</div>
      ${topCreators
        .map(
          (c) => `
        <div style="margin-bottom:12px;">
          <p style="color:#e5e5e7;font-weight:600;margin:0 0 2px;">${c.channelTitle} (${c.subscriberCount.toLocaleString()} subs)</p>
          <p style="margin:0;">Relevance: ${c.relevanceScore?.toFixed(1) ?? '—'}/10</p>
        </div>`,
        )
        .join('')}
    </div>`
      : '';

  const topCategoriesSection =
    dashboard.painPoints.topCategories.length > 0
      ? `<div class="card">
      <div class="label">Top Pain Categories (All Time)</div>
      ${dashboard.painPoints.topCategories.map((cat) => `<span class="pill">${cat}</span>`).join('')}
    </div>`
      : '';

  const contactedCount = outreachStats.find((s) => s.status === 'contacted')?._count.id ?? 0;
  const respondedCount = outreachStats.find((s) => s.status === 'responded')?._count.id ?? 0;
  const convertedCount = outreachStats.find((s) => s.status === 'converted')?._count.id ?? 0;

  const outreachSection = `<div class="card">
    <div class="label">Outreach Pipeline</div>
    <div class="stat-grid">
      <div><div class="stat">${contactedCount}</div><p>Emailed</p></div>
      <div><div class="stat">${respondedCount}</div><p>Responded</p></div>
      <div><div class="stat">${convertedCount}</div><p>Converted</p></div>
    </div>
  </div>`;

  const topSuggestionsSection =
    topSuggestions.length > 0
      ? `<div class="card">
      <div class="label">Top Performing Topic Sources</div>
      ${topSuggestions
        .map(
          (s) => `
        <div style="margin-bottom:12px;">
          <p style="color:#e5e5e7;font-weight:600;margin:0 0 2px;">${s.topic.slice(0, 60)}</p>
          <p style="margin:0;">Source: ${s.source} | Avg Engagement: <strong style="color:#00E5FF;">${s.avgPerformance?.toFixed(1)}</strong> | Used: ${s.timesUsed}x</p>
        </div>`,
        )
        .join('')}
    </div>`
      : '';

  const seo = dashboard.seo;

  const seoSection = `<div class="card">
    <div class="label">SEO Engine</div>
    <div class="stat-grid">
      <div><div class="stat">${seo.totalPublished}</div><p>Pages Live</p></div>
      <div><div class="stat">${seo.totalQueued}</div><p>Queued</p></div>
      <div><div class="stat">${seo.painPointGenerated}</div><p>Pain-Point Pages</p></div>
    </div>
    <div style="margin-top:14px;">
      <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">New pages (last 24h): <strong style="color:#e5e5e7;">${seo.pagesGeneratedLast24h}</strong></p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">Auto-refreshed (last 24h): <strong style="color:#e5e5e7;">${seo.pagesRefreshedLast24h}</strong></p>
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ClipScript Growth Brief — ${date}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0B0B0D; color: #e5e5e7; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 0 auto; padding: 32px 24px; }
    .card { background: #141417; border: 1px solid #2A2A2F; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .label { font-size: 11px; font-weight: 700; color: #00E5FF; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
    .stat { font-size: 28px; font-weight: 700; color: #e5e5e7; }
    .pill { display: inline-block; background: #1A1A1F; border: 1px solid #2A2A2F; border-radius: 20px; padding: 4px 12px; font-size: 12px; margin: 3px; }
    h2 { color: #e5e5e7; font-size: 18px; margin: 0 0 4px; }
    p { color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="label">ClipScript Growth Brief</div>
      <h2>${date}</h2>
    </div>

    <div class="card">
      <div class="label">Reddit</div>
      <div class="stat-grid">
        <div><div class="stat">${dashboard.reddit.commented}</div><p>Total Comments</p></div>
        <div><div class="stat">${dashboard.reddit.queued}</div><p>Queued</p></div>
        <div><div class="stat">${dashboard.reddit.avgKarma?.toFixed(1) ?? '—'}</div><p>Avg Karma</p></div>
      </div>
    </div>

    <div class="card">
      <div class="label">Creator Pipeline</div>
      <div class="stat-grid">
        <div><div class="stat">${dashboard.creators.briefed}</div><p>Briefed</p></div>
        <div><div class="stat">${dashboard.creators.contacted}</div><p>Contacted</p></div>
        <div><div class="stat">${dashboard.creators.converted}</div><p>Converted</p></div>
      </div>
    </div>

    <div class="card">
      <div class="label">Pain Intelligence</div>
      <div class="stat-grid">
        <div><div class="stat">${dashboard.painPoints.totalDiscovered}</div><p>Total Captured</p></div>
        <div><div class="stat">${dashboard.painPoints.avgOverallScore?.toFixed(1) ?? '—'}</div><p>Avg Score</p></div>
        <div><div class="stat">${dashboard.templates.challengers}</div><p>A/B Challengers</p></div>
      </div>
    </div>

    ${outreachSection}
    ${seoSection}
    ${painPointsSection}
    ${creatorsSection}
    ${topCategoriesSection}
    ${topSuggestionsSection}
  </div>
</body>
</html>`;
}

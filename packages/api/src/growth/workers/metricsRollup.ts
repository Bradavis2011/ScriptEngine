/**
 * Metrics Rollup Worker — daily 2 AM UTC
 *
 * Computes and persists a MetricSnapshot for the previous UTC day.
 * This gives the unit economics dashboard pre-materialized data
 * so trend queries don't require full table scans at read time.
 */

import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';

export async function runMetricsRollup(_job: Job): Promise<void> {
  console.log('[metricsRollup] Starting daily metrics rollup...');

  // "Yesterday" in UTC
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 3600_000);

  const dayStart = yesterdayUtc; // UTC midnight yesterday
  const dayEnd = todayUtc;       // UTC midnight today (exclusive)

  // Rolling windows for WAU/MAU (relative to end of day being rolled up)
  const day7  = new Date(dayEnd.getTime() - 7  * 24 * 3600_000);
  const day30 = new Date(dayEnd.getTime() - 30 * 24 * 3600_000);

  const [
    dauRows,
    wauRows,
    mauRows,
    newSignups,
    scriptsGenerated,
    filmedEvents,
    postedEvents,
    revenueToday,
    tierCounts,
  ] = await Promise.all([
    // DAU: distinct tenants with any UserEvent on the target day
    prisma.userEvent.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    }),
    // WAU
    prisma.userEvent.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: day7, lt: dayEnd } },
    }),
    // MAU
    prisma.userEvent.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: day30, lt: dayEnd } },
    }),
    // New signups on the target day
    prisma.tenant.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    }),
    // Scripts generated on the target day
    prisma.script.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    }),
    // script_filmed events on the target day
    prisma.userEvent.count({
      where: { event: 'script_filmed', createdAt: { gte: dayStart, lt: dayEnd } },
    }),
    // script_posted events on the target day
    prisma.userEvent.count({
      where: { event: 'script_posted', createdAt: { gte: dayStart, lt: dayEnd } },
    }),
    // Revenue on the target day (subscription + one-off)
    Promise.all([
      prisma.subscriptionEvent.aggregate({
        _sum: { revenueCents: true },
        where: { createdAt: { gte: dayStart, lt: dayEnd }, revenueCents: { gt: 0 } },
      }),
      prisma.conciergeOrder.aggregate({
        _sum: { amountPaid: true },
        where: { createdAt: { gte: dayStart, lt: dayEnd }, amountPaid: { not: null } },
      }),
    ]),
    // Tier breakdown at end of day (approximate — uses current counts)
    prisma.tenant.groupBy({
      by: ['tier'],
      _count: { id: true },
    }),
  ]);

  const [subRevToday, orderRevToday] = revenueToday;
  const revenueSum =
    (subRevToday._sum.revenueCents ?? 0) + (orderRevToday._sum.amountPaid ?? 0);

  // MRR estimate: map tiers to monthly revenue
  const MRR_BY_TIER: Record<string, number> = {
    pro:      700, // $7/mo
    founders: 500, // $5/mo effective
  };

  let mrrSnapshot = 0;
  let freeUsers = 0;
  let proUsers = 0;
  let foundersUsers = 0;

  for (const row of tierCounts) {
    const count = row._count.id;
    if (row.tier === 'free') {
      freeUsers = count;
    } else if (row.tier === 'pro') {
      proUsers = count;
      mrrSnapshot += count * (MRR_BY_TIER['pro'] ?? 700);
    } else if (row.tier === 'founders') {
      foundersUsers = count;
      mrrSnapshot += count * (MRR_BY_TIER['founders'] ?? 500);
    }
  }

  const activeSubscriptions = proUsers + foundersUsers;

  // Upsert snapshot for the target day (safe to re-run)
  await prisma.metricSnapshot.upsert({
    where: { date: dayStart },
    update: {
      dau: dauRows.length,
      wau: wauRows.length,
      mau: mauRows.length,
      newSignups,
      scriptsGenerated,
      scriptsFilmed: filmedEvents,
      scriptsPosted: postedEvents,
      revenueToday: revenueSum,
      mrrSnapshot,
      activeSubscriptions,
      freeUsers,
      proUsers,
      foundersUsers,
    },
    create: {
      date: dayStart,
      dau: dauRows.length,
      wau: wauRows.length,
      mau: mauRows.length,
      newSignups,
      scriptsGenerated,
      scriptsFilmed: filmedEvents,
      scriptsPosted: postedEvents,
      revenueToday: revenueSum,
      mrrSnapshot,
      activeSubscriptions,
      freeUsers,
      proUsers,
      foundersUsers,
    },
  });

  console.log(
    `[metricsRollup] Done — ${yesterdayUtc.toISOString().slice(0, 10)}: ` +
    `DAU=${dauRows.length}, MAU=${mauRows.length}, revenue=${revenueSum}¢, MRR=${mrrSnapshot}¢`,
  );
}

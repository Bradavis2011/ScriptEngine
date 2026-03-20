/**
 * Unit economics service — computes live DAU/MAU, MRR, LTV, churn, ARPU.
 *
 * Most metrics derive from:
 *   UserEvent      — product activity (session_start drives DAU/MAU)
 *   SubscriptionEvent — revenue log (INITIAL_PURCHASE, RENEWAL, etc.)
 *   MetricSnapshot — pre-materialized daily rollup (faster for trends)
 *   Tenant         — current tier counts (drives live MRR)
 *   ConciergeOrder — one-off revenue (pack + concierge purchases)
 */

import { prisma } from '../../lib/prisma';

// Monthly revenue per product in cents
const MRR_BY_PRODUCT: Record<string, number> = {
  pro_monthly:     700,  // $7/mo
  pro_annual:      700,  // $84/yr ÷ 12 = $7/mo
  founders_annual: 500,  // $60/yr ÷ 12 = $5/mo
};

// ---------------------------------------------------------------------------
// DAU / WAU / MAU — live from UserEvent
// ---------------------------------------------------------------------------

export interface ActiveUserCounts {
  dau: number;
  wau: number;
  mau: number;
}

export async function getActiveUsers(): Promise<ActiveUserCounts> {
  const now = new Date();
  const day1  = new Date(now.getTime() - 1  * 24 * 3600_000);
  const day7  = new Date(now.getTime() - 7  * 24 * 3600_000);
  const day30 = new Date(now.getTime() - 30 * 24 * 3600_000);

  // Count distinct tenants with any UserEvent in each window
  const [dauRows, wauRows, mauRows] = await Promise.all([
    prisma.userEvent.groupBy({ by: ['tenantId'], where: { createdAt: { gte: day1 } } }),
    prisma.userEvent.groupBy({ by: ['tenantId'], where: { createdAt: { gte: day7 } } }),
    prisma.userEvent.groupBy({ by: ['tenantId'], where: { createdAt: { gte: day30 } } }),
  ]);

  return { dau: dauRows.length, wau: wauRows.length, mau: mauRows.length };
}

// ---------------------------------------------------------------------------
// MRR — live from Tenant tiers
// ---------------------------------------------------------------------------

export interface MrrData {
  mrrCents: number;
  arrCents: number;
  byTier: Record<string, { count: number; mrrCents: number }>;
}

export async function getMrr(): Promise<MrrData> {
  const tierCounts = await prisma.tenant.groupBy({
    by: ['tier'],
    _count: { id: true },
    where: { tier: { not: 'free' } },
  });

  const byTier: Record<string, { count: number; mrrCents: number }> = {};
  let totalMrrCents = 0;

  for (const row of tierCounts) {
    // Map tier → product_id for MRR lookup
    // founders → founders_annual ($5/mo), pro → pro_monthly ($7/mo)
    const productKey = row.tier === 'founders' ? 'founders_annual' : 'pro_monthly';
    const mrrPerUser = MRR_BY_PRODUCT[productKey] ?? 700;
    const mrrCents = row._count.id * mrrPerUser;
    totalMrrCents += mrrCents;
    byTier[row.tier] = { count: row._count.id, mrrCents };
  }

  return {
    mrrCents: totalMrrCents,
    arrCents: totalMrrCents * 12,
    byTier,
  };
}

// ---------------------------------------------------------------------------
// LTV — average lifetime value per paying customer
// ---------------------------------------------------------------------------

export interface LtvData {
  avgLtvCents: number;
  totalRevenueCents: number;
  payingCustomers: number;
  subscriptionRevenueCents: number;
  oneOffRevenueCents: number;
}

export async function getLtv(): Promise<LtvData> {
  // Subscription revenue per tenant (from SubscriptionEvent)
  const subRevenue = await prisma.subscriptionEvent.groupBy({
    by: ['tenantId'],
    _sum: { revenueCents: true },
    where: {
      tenantId: { not: null },
      revenueCents: { gt: 0 },
    },
  });

  const subscriptionRevenueCents = subRevenue.reduce(
    (sum, r) => sum + (r._sum.revenueCents ?? 0),
    0,
  );

  // One-off revenue from ConciergeOrder (pack + concierge)
  const oneOffRevenue = await prisma.conciergeOrder.aggregate({
    _sum: { amountPaid: true },
    _count: { id: true },
    where: { amountPaid: { not: null } },
  });

  const oneOffRevenueCents = oneOffRevenue._sum.amountPaid ?? 0;

  // Total paying customers: tenants with any subscription revenue + unique concierge buyers
  const payingTenants = subRevenue.filter((r) => r.tenantId !== null).length;
  const oneOffBuyers = oneOffRevenue._count.id;
  // Deduplicate not possible without linking orders to tenants, so add both
  const payingCustomers = Math.max(payingTenants + oneOffBuyers, 1);

  const totalRevenueCents = subscriptionRevenueCents + oneOffRevenueCents;

  return {
    avgLtvCents: Math.round(totalRevenueCents / payingCustomers),
    totalRevenueCents,
    payingCustomers,
    subscriptionRevenueCents,
    oneOffRevenueCents,
  };
}

// ---------------------------------------------------------------------------
// ARPU — average revenue per user (MRR / total active users)
// ---------------------------------------------------------------------------

export async function getArpu(): Promise<{ arpuCents: number }> {
  const [mrr, activeUsers] = await Promise.all([getMrr(), getActiveUsers()]);
  const arpuCents = activeUsers.mau > 0 ? Math.round(mrr.mrrCents / activeUsers.mau) : 0;
  return { arpuCents };
}

// ---------------------------------------------------------------------------
// Churn — cancellations in last 30 days / subscriptions at start of period
// ---------------------------------------------------------------------------

export interface ChurnData {
  cancellations30d: number;
  activeAtStart: number;
  churnRate30d: number | null; // null if not enough data
}

export async function getChurn(): Promise<ChurnData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  const [cancellations, activeAtStart] = await Promise.all([
    prisma.subscriptionEvent.count({
      where: {
        eventType: 'CANCELLATION',
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // Active subscriptions 30 days ago = non-free tenants now + cancellations in period
    // (conservative estimate — exact cohort would require SubscriptionEvent history before this was deployed)
    prisma.tenant.count({ where: { tier: { not: 'free' } } }),
  ]);

  const denominator = activeAtStart + cancellations;
  const churnRate30d =
    denominator > 0 ? Math.round((cancellations / denominator) * 10000) / 100 : null;

  return { cancellations30d: cancellations, activeAtStart, churnRate30d };
}

// ---------------------------------------------------------------------------
// New signups — trend
// ---------------------------------------------------------------------------

export async function getSignupTrend(days: number = 30): Promise<Array<{ date: string; count: number }>> {
  const since = new Date(Date.now() - days * 24 * 3600_000);
  const tenants = await prisma.tenant.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const byDate: Record<string, number> = {};
  for (const t of tenants) {
    const d = t.createdAt.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + 1;
  }

  return Object.entries(byDate).map(([date, count]) => ({ date, count }));
}

// ---------------------------------------------------------------------------
// Revenue trend — from SubscriptionEvent + ConciergeOrder
// ---------------------------------------------------------------------------

export async function getRevenueTrend(days: number = 30): Promise<Array<{ date: string; cents: number }>> {
  const since = new Date(Date.now() - days * 24 * 3600_000);

  const [subEvents, conciergeOrders] = await Promise.all([
    prisma.subscriptionEvent.findMany({
      where: { createdAt: { gte: since }, revenueCents: { gt: 0 } },
      select: { createdAt: true, revenueCents: true },
    }),
    prisma.conciergeOrder.findMany({
      where: { createdAt: { gte: since }, amountPaid: { not: null } },
      select: { createdAt: true, amountPaid: true },
    }),
  ]);

  const byDate: Record<string, number> = {};

  for (const e of subEvents) {
    const d = e.createdAt.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + e.revenueCents;
  }
  for (const o of conciergeOrders) {
    const d = o.createdAt.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + (o.amountPaid ?? 0);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cents]) => ({ date, cents }));
}

// ---------------------------------------------------------------------------
// Cohort retention — % of Week-N signups still active in Week N+1, N+4, etc.
// ---------------------------------------------------------------------------

export interface CohortRow {
  cohort: string;       // "2026-W10" (ISO week)
  size: number;         // tenants who signed up that week
  w1: number | null;    // % active in week 1 after signup
  w4: number | null;    // % active in week 4
  w8: number | null;    // % active in week 8
}

export async function getCohortRetention(): Promise<CohortRow[]> {
  // Get all tenants with their signup date and last active date
  const tenants = await prisma.tenant.findMany({
    select: { id: true, createdAt: true, lastActiveAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group into ISO week cohorts
  function isoWeek(d: Date): string {
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const weekNum = Math.ceil(
      ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
    );
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  function weeksAfterSignup(signupDate: Date, activeDate: Date): number {
    return Math.floor((activeDate.getTime() - signupDate.getTime()) / (7 * 24 * 3600_000));
  }

  const cohorts: Record<string, { tenants: typeof tenants }> = {};
  for (const t of tenants) {
    const key = isoWeek(t.createdAt);
    if (!cohorts[key]) cohorts[key] = { tenants: [] };
    cohorts[key].tenants.push(t);
  }

  return Object.entries(cohorts)
    .slice(-12) // last 12 weeks
    .map(([cohort, { tenants: cohortTenants }]) => {
      const size = cohortTenants.length;
      if (size === 0) return { cohort, size, w1: null, w4: null, w8: null };

      const countActive = (minWeeks: number, maxWeeks: number) => {
        const active = cohortTenants.filter((t) => {
          if (!t.lastActiveAt) return false;
          const weeks = weeksAfterSignup(t.createdAt, t.lastActiveAt);
          return weeks >= minWeeks && weeks <= maxWeeks;
        }).length;
        return Math.round((active / size) * 100);
      };

      return {
        cohort,
        size,
        w1: countActive(1, 2),
        w4: countActive(3, 5),
        w8: countActive(6, 10),
      };
    });
}

// ---------------------------------------------------------------------------
// Full unit economics dashboard
// ---------------------------------------------------------------------------

export interface UnitEconomicsDashboard {
  activeUsers: ActiveUserCounts;
  mrr: MrrData;
  ltv: LtvData;
  arpu: { arpuCents: number };
  churn: ChurnData;
  totalTenants: number;
  signupTrend: Array<{ date: string; count: number }>;
  revenueTrend: Array<{ date: string; cents: number }>;
  cohortRetention: CohortRow[];
  latestSnapshot: {
    date: string;
    dau: number;
    mau: number;
    mrrSnapshot: number;
  } | null;
}

export async function getUnitEconomicsDashboard(): Promise<UnitEconomicsDashboard> {
  const [activeUsers, mrr, ltv, arpu, churn, totalTenants, signupTrend, revenueTrend, cohortRetention, latestSnapshot] =
    await Promise.all([
      getActiveUsers(),
      getMrr(),
      getLtv(),
      getArpu(),
      getChurn(),
      prisma.tenant.count(),
      getSignupTrend(30),
      getRevenueTrend(30),
      getCohortRetention(),
      prisma.metricSnapshot.findFirst({ orderBy: { date: 'desc' } }),
    ]);

  return {
    activeUsers,
    mrr,
    ltv,
    arpu,
    churn,
    totalTenants,
    signupTrend,
    revenueTrend,
    cohortRetention,
    latestSnapshot: latestSnapshot
      ? {
          date: latestSnapshot.date.toISOString().slice(0, 10),
          dau: latestSnapshot.dau,
          mau: latestSnapshot.mau,
          mrrSnapshot: latestSnapshot.mrrSnapshot,
        }
      : null,
  };
}

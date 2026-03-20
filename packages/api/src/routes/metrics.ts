/**
 * Admin-only unit economics dashboard.
 *
 * GET /api/metrics — full dashboard (live data)
 * GET /api/metrics/snapshots?days=30 — historical MetricSnapshot trend
 */

import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { getUnitEconomicsDashboard } from '../growth/services/unitEconomics';

const router = Router();

// All metrics endpoints require auth + admin
async function requireAdmin(req: AuthedRequest, res: Response): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { clerkUserId: req.clerkUserId },
    select: { isAdmin: true },
  });
  if (!tenant?.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return false;
  }
  return true;
}

// GET /api/metrics — full live unit economics dashboard
router.get('/', requireAuth, async (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  if (!(await requireAdmin(authedReq, res))) return;

  try {
    const dashboard = await getUnitEconomicsDashboard();
    res.json(dashboard);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[metrics] dashboard error:', msg);
    res.status(500).json({ error: 'Failed to compute metrics', detail: msg });
  }
});

// GET /api/metrics/snapshots?days=30 — historical daily snapshots
router.get('/snapshots', requireAuth, async (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  if (!(await requireAdmin(authedReq, res))) return;

  const days = Math.min(parseInt(String(req.query.days ?? '30'), 10) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 3600_000);

  const snapshots = await prisma.metricSnapshot.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  res.json(snapshots);
});

export default router;

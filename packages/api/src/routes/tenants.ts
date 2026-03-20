import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/tenants — create or update tenant (called after onboarding)
router.post('/', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { email, niche, city, callToAction } = req.body as {
    email?: string;
    niche?: string;
    city?: string;
    callToAction?: string;
  };

  if (!email || !niche) {
    res.status(400).json({ error: 'email and niche are required' });
    return;
  }

  const tenant = await prisma.tenant.upsert({
    where: { clerkUserId },
    update: { email, niche, city: city ?? null, callToAction: callToAction ?? null },
    create: { clerkUserId, email, niche, city: city ?? null, callToAction: callToAction ?? null },
  });

  res.json(tenant);
});

// PATCH /api/tenants/me — update niche, city, callToAction
router.patch('/me', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { niche, city, callToAction } = req.body as {
    niche?: string;
    city?: string;
    callToAction?: string;
  };

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const updated = await prisma.tenant.update({
    where: { clerkUserId },
    data: {
      ...(niche !== undefined && { niche }),
      ...(city !== undefined && { city: city || null }),
      ...(callToAction !== undefined && { callToAction: callToAction || null }),
    },
  });

  res.json(updated);
});

// GET /api/tenants/me — get current tenant
router.get('/me', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found — complete onboarding first' });
    return;
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const scriptsToday = await prisma.script.count({
    where: { tenantId: tenant.id, createdAt: { gte: startOfDay } },
  });

  res.json({
    ...tenant,
    scriptsToday,
    // Admins have unlimited generation; expose a sentinel value the client can use
    scriptsPerDay: tenant.isAdmin ? null : tenant.scriptsPerDay,
  });
});

export default router;

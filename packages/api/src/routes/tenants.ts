import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/tenants — create or update tenant (called after onboarding)
router.post('/', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { email, niche } = req.body as { email?: string; niche?: string };

  if (!email || !niche) {
    res.status(400).json({ error: 'email and niche are required' });
    return;
  }

  const tenant = await prisma.tenant.upsert({
    where: { clerkUserId },
    update: { email, niche },
    create: { clerkUserId, email, niche },
  });

  res.json(tenant);
});

// GET /api/tenants/me — get current tenant
router.get('/me', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found — complete onboarding first' });
    return;
  }

  res.json(tenant);
});

export default router;

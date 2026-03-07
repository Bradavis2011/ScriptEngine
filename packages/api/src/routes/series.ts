import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/series — list all series for tenant
router.get('/', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const series = await prisma.series.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(series);
});

// POST /api/series — create a new series
router.post('/', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const series = await prisma.series.create({
    data: { tenantId: tenant.id, name: name.trim() },
  });

  res.status(201).json(series);
});

// GET /api/series/:id/episodes — scripts in a series
router.get('/:id/episodes', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const series = await prisma.series.findFirst({
    where: { id: req.params.id, tenantId: tenant.id },
  });
  if (!series) {
    res.status(404).json({ error: 'Series not found' });
    return;
  }

  const episodes = await prisma.script.findMany({
    where: { seriesId: req.params.id, tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  });

  res.json(episodes);
});

export default router;

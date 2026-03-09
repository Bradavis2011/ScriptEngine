import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { generateScript, GenerateScriptInput } from '../lib/gemini';

const router = Router();

const SCRIPT_TYPES = ['series_episode', 'data_drop', 'trend_take', 'niche_tip'] as const;
type ScriptType = (typeof SCRIPT_TYPES)[number];

// GET /api/scripts — all scripts for tenant, optional ?status= filter
router.get('/', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { status } = req.query;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found — complete onboarding first' });
    return;
  }

  const where: Record<string, unknown> = { tenantId: tenant.id };
  if (status && typeof status === 'string') {
    where.filmingStatus = status;
  }

  const scripts = await prisma.script.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json(scripts);
});

// POST /api/scripts/generate — generate scripts for the authed tenant
router.post('/generate', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found — complete onboarding first' });
    return;
  }

  const { scriptType, seriesId, additionalContext } = req.body as {
    scriptType?: ScriptType;
    seriesId?: string;
    additionalContext?: string;
  };

  const resolvedType: ScriptType =
    SCRIPT_TYPES.includes(scriptType as ScriptType) ? (scriptType as ScriptType) : 'niche_tip';

  let seriesName: string | undefined;
  let episodeNumber: number | undefined;

  if (seriesId) {
    const series = await prisma.series.findFirst({
      where: { id: seriesId, tenantId: tenant.id },
      include: { _count: { select: { scripts: true } } },
    });
    if (series) {
      seriesName = series.name;
      episodeNumber = series._count.scripts + 1;
    }
  }

  const input: GenerateScriptInput = {
    niche: tenant.niche,
    scriptType: resolvedType,
    seriesName,
    episodeNumber,
    additionalContext,
  };

  let scriptData;
  try {
    scriptData = await generateScript(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[scripts/generate] Gemini error:', message);
    res.status(502).json({ error: 'Script generation failed', detail: message });
    return;
  }

  const script = await prisma.script.create({
    data: {
      tenantId: tenant.id,
      scriptType: resolvedType,
      scriptData: scriptData as any,
      seriesId: seriesId ?? null,
    },
  });

  // If part of a series, increment episodeCount
  if (seriesId) {
    await prisma.series.update({
      where: { id: seriesId },
      data: { episodeCount: { increment: 1 } },
    });
  }

  res.json(script);
});

// GET /api/scripts/today — scripts created today
router.get('/today', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const scripts = await prisma.script.findMany({
    where: { tenantId: tenant.id, createdAt: { gte: startOfDay } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(scripts);
});

// GET /api/scripts/:id — single script
router.get('/:id', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const id = String(req.params.id);
  const script = await prisma.script.findFirst({
    where: { id, tenantId: tenant.id },
  });

  if (!script) {
    res.status(404).json({ error: 'Script not found' });
    return;
  }

  res.json(script);
});

// PATCH /api/scripts/:id/status — update filming status
router.patch('/:id/status', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { filmingStatus } = req.body as { filmingStatus?: string };

  const validStatuses = ['ready', 'filmed', 'posted'];
  if (!filmingStatus || !validStatuses.includes(filmingStatus)) {
    res.status(400).json({ error: `filmingStatus must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const id = String(req.params.id);
  const script = await prisma.script.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!script) {
    res.status(404).json({ error: 'Script not found' });
    return;
  }

  const updated = await prisma.script.update({
    where: { id },
    data: { filmingStatus },
  });

  res.json(updated);
});

export default router;

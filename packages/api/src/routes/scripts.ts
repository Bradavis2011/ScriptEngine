import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { generateScript, GenerateScriptInput } from '../lib/gemini';
import { getActivePrompt } from '../lib/promptVersions';
import { computeEngagementScore, checkExperimentCompletion } from '../lib/calibration';

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

  // Resolve prompt version (A/B: 80% current, 20% challenger)
  const { prompt: typePrompt, promptVersionId } = await getActivePrompt(resolvedType);

  const input: GenerateScriptInput = {
    niche: tenant.niche,
    scriptType: resolvedType,
    seriesName,
    episodeNumber,
    additionalContext,
  };

  let scriptData;
  try {
    scriptData = await generateScript(input, typePrompt);
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
      promptVersionId,
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

// POST /api/scripts/:id/performance — log performance data for a posted script
router.post('/:id/performance', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;
  const { views, likes, shares, follows } = req.body as {
    views?: number;
    likes?: number;
    shares?: number;
    follows?: number;
  };

  if (views == null || views < 0) {
    res.status(400).json({ error: 'views is required and must be >= 0' });
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

  const performance = {
    views: views ?? 0,
    likes: likes ?? 0,
    shares: shares ?? 0,
    follows: follows ?? 0,
    engagementScore: computeEngagementScore({
      views: views ?? 0,
      likes: likes ?? 0,
      shares: shares ?? 0,
      follows: follows ?? 0,
    }),
    loggedAt: new Date().toISOString(),
  };

  const updated = await prisma.script.update({
    where: { id },
    data: {
      performance: performance as any,
      filmingStatus: 'posted', // auto-mark as posted when logging performance
    },
  });

  // Check if any experiments can be evaluated with this new data
  if (script.scriptType) {
    checkExperimentCompletion(script.scriptType).catch((err) =>
      console.error('[scripts/performance] calibration check failed:', err),
    );
  }

  res.json(updated);
});

export default router;

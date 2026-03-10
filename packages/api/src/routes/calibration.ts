import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { getCalibrationSnapshot, checkExperimentCompletion } from '../lib/calibration';
import { seedPromptVersions } from '../lib/promptVersions';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/calibration — current calibration snapshot
router.get('/', requireAuth, async (_req, res: Response) => {
  const snapshot = await getCalibrationSnapshot();
  res.json(snapshot);
});

// POST /api/calibration/refresh — trigger recalibration for all script types
router.post('/refresh', requireAuth, async (_req, res: Response) => {
  const scriptTypes = ['data_drop', 'trend_take', 'niche_tip', 'niche_tip_basic', 'series_episode'];

  for (const scriptType of scriptTypes) {
    await checkExperimentCompletion(scriptType);
  }

  const snapshot = await getCalibrationSnapshot();
  res.json({ refreshed: true, ...snapshot });
});

// POST /api/calibration/seed — seed initial prompt versions from hardcoded prompts
router.post('/seed', requireAuth, async (_req, res: Response) => {
  const created = await seedPromptVersions();
  res.json({ seeded: created });
});

// GET /api/calibration/versions — list all prompt versions
router.get('/versions', requireAuth, async (_req, res: Response) => {
  const versions = await prisma.promptVersion.findMany({
    orderBy: [{ scriptType: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(versions);
});

export default router;

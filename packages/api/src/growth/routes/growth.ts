import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import { prisma } from '../../lib/prisma';
import { getGrowthDashboard } from '../services/growthMetrics';
import { seedGrowthTemplates } from '../services/growthTemplates';
import { postComment } from '../services/redditClient';
import { getQueues, QUEUE_NAMES, JOB_DEFAULTS } from '../queues';
import { Prisma } from '@prisma/client';

const router = Router();

// All growth routes require admin
router.use(requireAdmin as any);

// GET /api/growth/dashboard
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = await getGrowthDashboard();
    res.json(dashboard);
  } catch (err) {
    console.error('[growth/dashboard]', err);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ─── Reddit Threads ───────────────────────────────────────────────────────────

router.get('/reddit/threads', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const subreddit = req.query.subreddit as string | undefined;
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = parseInt((req.query.limit as string) ?? '25');
    const skip = (page - 1) * limit;

    const where: Prisma.RedditThreadWhereInput = {};
    if (status) where.status = status;
    if (subreddit) where.subreddit = subreddit;

    const [threads, total] = await Promise.all([
      prisma.redditThread.findMany({ where, skip, take: limit, orderBy: { discoveredAt: 'desc' } }),
      prisma.redditThread.count({ where }),
    ]);

    res.json({ threads, total, page, limit });
  } catch (err) {
    console.error('[growth/reddit/threads]', err);
    res.status(500).json({ error: 'Failed to get threads' });
  }
});

router.get('/reddit/threads/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const thread = await prisma.redditThread.findUnique({ where: { id } });
    if (!thread) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(thread);
  } catch (err) {
    console.error('[growth/reddit/threads/:id GET]', err);
    res.status(500).json({ error: 'Failed to get thread' });
  }
});

router.patch('/reddit/threads/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const { status } = req.body as { status?: string };
    const thread = await prisma.redditThread.update({
      where: { id },
      data: { ...(status !== undefined ? { status } : {}) },
    });
    res.json(thread);
  } catch (err) {
    console.error('[growth/reddit/threads/:id PATCH]', err);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

router.post('/reddit/threads/:id/post', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const thread = await prisma.redditThread.findUnique({ where: { id } });
    if (!thread) { res.status(404).json({ error: 'Not found' }); return; }
    if (!thread.commentBody) { res.status(400).json({ error: 'No comment body to post' }); return; }

    const commentId = await postComment(thread.redditId, thread.commentBody);
    const updated = await prisma.redditThread.update({
      where: { id: thread.id },
      data: { status: 'commented', commentId, commentedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error('[growth/reddit/threads/:id/post]', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// ─── Creator Prospects ────────────────────────────────────────────────────────

router.get('/creators', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = parseInt((req.query.limit as string) ?? '25');
    const skip = (page - 1) * limit;

    const where: Prisma.CreatorProspectWhereInput = {};
    if (status) where.status = status;

    const [creators, total] = await Promise.all([
      prisma.creatorProspect.findMany({ where, skip, take: limit, orderBy: { relevanceScore: 'desc' } }),
      prisma.creatorProspect.count({ where }),
    ]);

    res.json({ creators, total, page, limit });
  } catch (err) {
    console.error('[growth/creators]', err);
    res.status(500).json({ error: 'Failed to get creators' });
  }
});

router.get('/creators/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const creator = await prisma.creatorProspect.findUnique({ where: { id } });
    if (!creator) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(creator);
  } catch (err) {
    console.error('[growth/creators/:id GET]', err);
    res.status(500).json({ error: 'Failed to get creator' });
  }
});

router.patch('/creators/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const { status, notes } = req.body as { status?: string; notes?: string };
    const creator = await prisma.creatorProspect.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(status === 'contacted' ? { contactedAt: new Date() } : {}),
        ...(status === 'responded' ? { respondedAt: new Date() } : {}),
      },
    });
    res.json(creator);
  } catch (err) {
    console.error('[growth/creators/:id PATCH]', err);
    res.status(500).json({ error: 'Failed to update creator' });
  }
});

// ─── Pain Points ──────────────────────────────────────────────────────────────

router.get('/pain-points', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = parseInt((req.query.limit as string) ?? '25');
    const skip = (page - 1) * limit;

    const [points, total] = await Promise.all([
      prisma.painPoint.findMany({ skip, take: limit, orderBy: { overallScore: 'desc' } }),
      prisma.painPoint.count(),
    ]);

    res.json({ points, total, page, limit });
  } catch (err) {
    console.error('[growth/pain-points]', err);
    res.status(500).json({ error: 'Failed to get pain points' });
  }
});

// ─── Templates ────────────────────────────────────────────────────────────────

router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.growthTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(templates);
  } catch (err) {
    console.error('[growth/templates]', err);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

router.post('/templates/seed', async (_req: Request, res: Response) => {
  try {
    const count = await seedGrowthTemplates();
    res.json({ seeded: count });
  } catch (err) {
    console.error('[growth/templates/seed]', err);
    res.status(500).json({ error: 'Failed to seed templates' });
  }
});

// ─── Events ───────────────────────────────────────────────────────────────────

router.get('/events', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = parseInt((req.query.limit as string) ?? '50');
    const skip = (page - 1) * limit;

    const events = await prisma.growthEvent.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    res.json(events);
  } catch (err) {
    console.error('[growth/events]', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// ─── Learning ─────────────────────────────────────────────────────────────────

router.post('/learning/run', async (_req: Request, res: Response) => {
  try {
    const queues = getQueues();
    const learningQueue = queues.get(QUEUE_NAMES.GROWTH_LEARNING);
    if (!learningQueue) {
      res.status(503).json({ error: 'Growth workers not running (REDIS_URL not set)' });
      return;
    }
    await learningQueue.add('manual-run', {}, JOB_DEFAULTS);
    res.json({ message: 'Learning job queued' });
  } catch (err) {
    console.error('[growth/learning/run]', err);
    res.status(500).json({ error: 'Failed to queue learning job' });
  }
});

export default router;

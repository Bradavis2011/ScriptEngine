/**
 * GET /api/scripts/suggestions
 * Returns top 5 topic suggestions for the authed tenant's niche.
 * Each suggestion includes topic, source, scriptType, and contextSnippet.
 */

import { Router, Response } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/scripts/suggestions — top suggestions for tenant's niche
router.get('/', requireAuth, async (req, res: Response) => {
  const { clerkUserId } = req as AuthedRequest;

  const tenant = await prisma.tenant.findUnique({ where: { clerkUserId } });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found — complete onboarding first' });
    return;
  }

  const suggestions = await prisma.topicSuggestion.findMany({
    where: {
      niche: tenant.niche,
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ relevanceScore: 'desc' }, { createdAt: 'desc' }],
    take: 5,
    select: {
      id: true,
      topic: true,
      source: true,
      sourceUrl: true,
      scriptType: true,
      contextSnippet: true,
      relevanceScore: true,
      timesUsed: true,
      avgPerformance: true,
      expiresAt: true,
    },
  });

  res.json(suggestions);
});

export default router;

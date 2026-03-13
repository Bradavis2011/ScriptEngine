import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/seo/pages — all published SeoPage records (public, no auth)
router.get('/pages', async (_req: Request, res: Response) => {
  try {
    const pages = await prisma.seoPage.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        slug: true,
        pageType: true,
        targetKeyword: true,
        niche: true,
        city: true,
        pageTitle: true,
        metaDescription: true,
        h1: true,
        contentJson: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(pages);
  } catch (err) {
    console.error('[seo/pages]', err);
    res.status(500).json({ error: 'Failed to get SEO pages' });
  }
});

// GET /api/seo/pages/:slug — single published page (public, no auth)
router.get('/pages/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    const page = await prisma.seoPage.findUnique({
      where: { slug },
    });
    if (!page || page.status !== 'published') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(page);
  } catch (err) {
    console.error('[seo/pages/:slug]', err);
    res.status(500).json({ error: 'Failed to get SEO page' });
  }
});

export default router;

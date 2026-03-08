import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/report/:token — serve stored HTML report (no auth required, token is the secret)
router.get('/:token', async (req: Request, res: Response) => {
  const token = req.params['token'] as string;

  const order = await prisma.conciergeOrder.findUnique({
    where: { reportToken: token },
    select: { reportHtml: true, orderType: true, niche: true, topic: true },
  });

  if (!order) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  if (!order.reportHtml) {
    res.status(202).json({ error: 'Report is still being generated. Check back in a minute.' });
    return;
  }

  res.json({
    html: order.reportHtml,
    orderType: order.orderType,
    niche: order.niche,
    topic: order.topic,
  });
});

export default router;

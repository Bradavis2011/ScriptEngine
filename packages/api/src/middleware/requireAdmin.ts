import { Request, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from './requireAuth';
import { prisma } from '../lib/prisma';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Secret key bypass — set ADMIN_SECRET_KEY in Railway env vars
  if (process.env.ADMIN_SECRET_KEY) {
    const provided = req.headers['x-admin-key'];
    if (provided === process.env.ADMIN_SECRET_KEY) {
      next();
      return;
    }
  }

  // Run requireAuth first — it will either call next or send 401
  await new Promise<void>((resolve) => {
    requireAuth(req, res, () => resolve());
  });

  // If requireAuth sent a response (401), stop here
  if (res.headersSent) return;

  const clerkUserId = (req as AuthedRequest).clerkUserId;

  const tenant = await prisma.tenant
    .findUnique({ where: { clerkUserId }, select: { isAdmin: true } })
    .catch(() => null);

  if (!tenant?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

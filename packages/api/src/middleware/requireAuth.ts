import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';

export interface AuthedRequest extends Request {
  clerkUserId: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const { sub } = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    (req as AuthedRequest).clerkUserId = sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

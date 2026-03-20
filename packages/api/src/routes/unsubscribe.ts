/**
 * GET /api/unsubscribe/:token
 *
 * Validates a signed unsubscribe token and adds the email to UnsubscribeList.
 * Token is HMAC-SHA256(email, UNSUBSCRIBE_SECRET), truncated to 32 hex chars.
 * Returns a simple HTML confirmation page.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

const router = Router();

function verifyToken(email: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? process.env.CLERK_SECRET_KEY ?? 'default-secret';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(email)
    .digest('hex')
    .slice(0, 32);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
}

// GET /api/unsubscribe/:token?email=...
// The email is passed as a query param; the token validates it
router.get('/:token', async (req: Request, res: Response) => {
  const token = typeof req.params.token === 'string' ? req.params.token : '';
  const rawEmail = req.query.email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  const errorHtml = (msg: string) => `
    <!DOCTYPE html><html><head><title>Unsubscribe — ClipScript</title></head>
    <body style="font-family:system-ui,sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#1a1a1a;">
      <h2>Invalid Link</h2><p>${msg}</p>
    </body></html>`;

  const successHtml = (addr: string) => `
    <!DOCTYPE html><html><head><title>Unsubscribed — ClipScript</title></head>
    <body style="font-family:system-ui,sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#1a1a1a;">
      <h2>You've been unsubscribed</h2>
      <p>${addr} has been removed from ClipScript outreach emails.</p>
      <p style="color:#666;font-size:14px;">You won't receive any more emails from us.</p>
    </body></html>`;

  if (!email || !email.includes('@')) {
    res.status(400).send(errorHtml('Missing or invalid email address.'));
    return;
  }

  if (!token || token.length !== 32) {
    res.status(400).send(errorHtml('Invalid or expired unsubscribe link.'));
    return;
  }

  try {
    if (!verifyToken(email, token)) {
      res.status(400).send(errorHtml('Invalid unsubscribe link — please contact us directly.'));
      return;
    }
  } catch {
    res.status(400).send(errorHtml('Invalid unsubscribe link.'));
    return;
  }

  // Add to unsubscribe list (upsert — idempotent)
  await prisma.unsubscribeList.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  res.send(successHtml(email));
});

export default router;

/**
 * Creator Outreach Worker — Mon/Wed/Fri 10 AM UTC
 *
 * Sends personalized outreach emails to briefed creator prospects.
 * Rate-limited to 5/day to avoid spam flags.
 * Respects UnsubscribeList and requires contactInfo to be set.
 *
 * Env vars required: RESEND_API_KEY, ADMIN_EMAIL, FRONTEND_URL
 */

import { Job } from 'bullmq';
import { Resend } from 'resend';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

const MAX_PER_RUN = 5;

function generateUnsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? process.env.CLERK_SECRET_KEY ?? 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(email)
    .digest('hex')
    .slice(0, 32);
}

export async function runCreatorOutreach(_job: Job): Promise<void> {
  console.log('[creatorOutreach] Starting outreach run...');

  if (!process.env.RESEND_API_KEY) {
    console.warn('[creatorOutreach] RESEND_API_KEY not set — skipping');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://clipscriptai.com';

  // Find eligible prospects
  const prospects = await prisma.creatorProspect.findMany({
    where: {
      status: 'briefed',
      contactInfo: { not: null },
      relevanceScore: { gte: 7 },
    },
    orderBy: { relevanceScore: 'desc' },
    take: MAX_PER_RUN,
  });

  if (prospects.length === 0) {
    console.log('[creatorOutreach] No eligible prospects found');
    return;
  }

  let sent = 0;
  let skipped = 0;

  for (const prospect of prospects) {
    const email = prospect.contactInfo!;

    // Check unsubscribe list
    const unsub = await prisma.unsubscribeList.findUnique({ where: { email } });
    if (unsub) {
      console.log(`[creatorOutreach] Skipping ${email} — unsubscribed`);
      skipped++;
      continue;
    }

    const token = generateUnsubscribeToken(email);
    const unsubscribeUrl = `${frontendUrl}/api/unsubscribe/${token}`;

    const dm = prospect.personalizedDm ?? `Hi ${prospect.channelTitle}, I wanted to reach out about ClipScript — a tool that generates short-form video scripts in seconds. Would love to show you how it works.`;

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Quick note, ${prospect.channelTitle.split(' ')[0]}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
            <p>${dm.replace(/\n/g, '<br>')}</p>
            <p style="margin-top:32px;">— ClipScript Team</p>
            <hr style="margin:32px 0;border:none;border-top:1px solid #e5e5e5;">
            <p style="font-size:12px;color:#999;">
              You're receiving this because your contact info is publicly listed on your YouTube channel.<br>
              <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>
            </p>
          </div>
        `,
      });

      await prisma.creatorProspect.update({
        where: { id: prospect.id },
        data: { status: 'contacted', contactedAt: new Date() },
      });

      await prisma.growthEvent.create({
        data: {
          channel: 'creator',
          eventType: 'dm',
          entityId: prospect.id,
          data: { email, channelTitle: prospect.channelTitle, relevanceScore: prospect.relevanceScore },
        },
      });

      console.log(`[creatorOutreach] Sent to ${prospect.channelTitle} (${email})`);
      sent++;
    } catch (err) {
      console.error(
        `[creatorOutreach] Failed to send to ${email}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`[creatorOutreach] Done — ${sent} sent, ${skipped} skipped (unsubscribed)`);
}

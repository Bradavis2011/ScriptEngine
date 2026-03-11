import { Job } from 'bullmq';
import { Resend } from 'resend';
import { prisma } from '../../lib/prisma';
import { buildDailyBriefHtml } from '../services/dailyBriefBuilder';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function runDailyBrief(_job: Job): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[dailyBrief] ADMIN_EMAIL not set — skipping');
    return;
  }

  console.log('[dailyBrief] Building brief...');
  const html = await buildDailyBriefHtml();

  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: adminEmail,
    subject: `ClipScript Growth Brief — ${date}`,
    html,
  });

  await prisma.growthEvent.create({
    data: {
      channel: 'learning',
      eventType: 'brief_sent',
      data: { recipient: adminEmail },
    },
  });

  console.log(`[dailyBrief] Brief sent to ${adminEmail}`);
}

import { Resend } from 'resend';
import { ScriptData } from './gemini';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'scripts@clipscriptai.com';

export async function sendConciergeDelivery({
  toEmail,
  scriptData,
  niche,
}: {
  toEmail: string;
  scriptData: ScriptData;
  niche: string;
}) {
  const sectionsHtml = scriptData.sections
    .map(
      (s) => `
        <div style="margin-bottom:16px;">
          <strong>${s.heading}</strong><br/>
          <p style="margin:4px 0;">${s.script}</p>
          <em style="color:#888;">B-Roll: ${s.bRollSuggestion}</em>
        </div>`
    )
    .join('');

  const hashtagsText = scriptData.hashtags.map((h) => `#${h}`).join(' ');

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your ClipScript concierge script is ready 🎬`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#0B0B0D;">Your Script is Ready</h1>
        <p>Here's your custom ${niche} script, crafted just for you.</p>

        <h2>Cold Open (first 3 seconds)</h2>
        <p style="font-size:18px;font-weight:bold;">${scriptData.coldOpen}</p>

        <h2>Script</h2>
        ${sectionsHtml}

        <h2>Call to Action</h2>
        <p>${scriptData.callToAction}</p>

        <hr style="margin:24px 0;" />

        <h2>Caption</h2>
        <p>${scriptData.caption}</p>
        <p style="color:#555;">${hashtagsText}</p>

        <hr style="margin:24px 0;" />

        <h2>Teleprompter Script</h2>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px;">${scriptData.teleprompterText}</p>

        <p style="color:#888;font-size:12px;margin-top:32px;">
          Estimated delivery time: ${scriptData.totalDurationSeconds}s<br/>
          ClipScript — short-form scripts that actually get filmed
        </p>
      </div>
    `,
  });
}

export async function sendInternalConciergeAlert({
  orderEmail,
  niche,
  stripePaymentId,
}: {
  orderEmail: string;
  niche: string;
  stripePaymentId: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL ?? FROM;
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[ClipScript] New concierge order — ${orderEmail}`,
    html: `
      <p><strong>Order from:</strong> ${orderEmail}</p>
      <p><strong>Niche:</strong> ${niche ?? 'not specified'}</p>
      <p><strong>Stripe Payment ID:</strong> ${stripePaymentId}</p>
    `,
  });
}

import { Resend } from 'resend';
import { ScriptData } from './gemini';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'scripts@clipscriptai.com';

function scriptHtml(script: ScriptData, index: number, niche: string): string {
  const sectionsHtml = script.sections
    .map(
      (s) => `
      <div style="margin-bottom:12px;">
        <strong style="font-size:13px;text-transform:uppercase;color:#666;">${s.heading}</strong><br/>
        <p style="margin:4px 0;">${s.script}</p>
        <em style="color:#999;font-size:12px;">B-Roll: ${s.bRollSuggestion}</em>
      </div>`
    )
    .join('');

  const hashtags = script.hashtags.map((h) => `#${h}`).join(' ');

  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;margin:0 0 12px;">
        Script ${index + 1} of 5 — ${script.totalDurationSeconds}s
      </p>

      <p style="font-size:18px;font-weight:700;margin:0 0 16px;">"${script.coldOpen}"</p>

      ${sectionsHtml}

      <div style="background:#f9f9f9;padding:14px;border-radius:8px;margin-top:16px;">
        <p style="font-size:12px;color:#666;margin:0 0 6px;font-weight:600;">TELEPROMPTER TEXT</p>
        <p style="margin:0;line-height:1.7;">${script.teleprompterText}</p>
      </div>

      <div style="margin-top:14px;">
        <p style="font-size:12px;color:#666;margin:0 0 4px;font-weight:600;">CAPTION</p>
        <p style="margin:0;">${script.caption}</p>
        <p style="margin:4px 0 0;color:#888;font-size:12px;">${hashtags}</p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Pack delivery — 5 scripts
// ---------------------------------------------------------------------------
export async function sendPackDelivery({
  toEmail,
  scripts,
  niche,
  topic,
}: {
  toEmail: string;
  scripts: ScriptData[];
  niche: string;
  topic: string;
}) {
  const scriptsHtml = scripts.map((s, i) => scriptHtml(s, i, niche)).join('');

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your 5 ClipScript scripts are ready 🎬`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#111;">
        <h1 style="font-size:24px;margin-bottom:4px;">Your 5 Scripts Are Ready</h1>
        <p style="color:#555;margin-bottom:8px;">
          Niche: <strong>${niche}</strong> — Topic: <strong>${topic || 'general'}</strong>
        </p>
        <p style="color:#555;margin-bottom:28px;font-size:14px;">
          Copy your teleprompter text directly into your camera app.
          Want tweaks or a custom version? Reply to this email.
        </p>

        ${scriptsHtml}

        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="color:#888;font-size:12px;">
          ClipScript — short-form scripts built for filming.<br/>
          Questions? Reply to this email or contact hello@clipscriptai.com
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Concierge delivery — 1 custom script
// ---------------------------------------------------------------------------
export async function sendConciergeDelivery({
  toEmail,
  scriptData,
  niche,
  topic,
}: {
  toEmail: string;
  scriptData: ScriptData;
  niche: string;
  topic?: string;
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
        <h1 style="color:#0B0B0D;">Your Custom Script is Ready</h1>
        <p>Here's your ${niche} concierge script${topic ? ` on "${topic}"` : ''}, crafted just for you.</p>
        <p style="color:#555;font-size:14px;">
          You have <strong>2 tweaks</strong> included — just reply to this email with what you'd like adjusted
          (wording, tone, angle) and we'll revise within 24 hours. Note: tweaks are refinements, not full rewrites.
        </p>

        <h2>Cold Open (first 3 seconds)</h2>
        <p style="font-size:18px;font-weight:bold;">"${scriptData.coldOpen}"</p>

        <h2>Script Sections</h2>
        ${sectionsHtml}

        <h2>Call to Action</h2>
        <p>${scriptData.callToAction}</p>

        <hr style="margin:24px 0;" />

        <h2>Teleprompter Text</h2>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px;line-height:1.8;">${scriptData.teleprompterText}</p>

        <h2>Caption</h2>
        <p>${scriptData.caption}</p>
        <p style="color:#555;">${hashtagsText}</p>

        <hr style="margin:24px 0;" />
        <p style="color:#888;font-size:12px;">
          Estimated run time: ${scriptData.totalDurationSeconds}s<br/>
          ClipScript — reply here for your tweaks · hello@clipscriptai.com
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Internal alert — concierge order notification
// ---------------------------------------------------------------------------
export async function sendInternalConciergeAlert({
  orderEmail,
  niche,
  topic,
  brief,
  stripePaymentId,
}: {
  orderEmail: string;
  niche: string;
  topic?: string;
  brief?: string;
  stripePaymentId: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL ?? FROM;
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[ClipScript] New concierge order — ${orderEmail}`,
    html: `
      <p><strong>Order from:</strong> ${orderEmail}</p>
      <p><strong>Niche:</strong> ${niche || 'not specified'}</p>
      <p><strong>Topic/angle:</strong> ${topic || 'not specified'}</p>
      <p><strong>Additional context:</strong> ${brief || 'none'}</p>
      <p><strong>Stripe Payment ID:</strong> ${stripePaymentId}</p>
      <p style="color:#555;font-size:13px;">
        Script will be auto-generated and delivered.
        Customer gets 2 tweaks — watch for replies to the from address.
      </p>
    `,
  });
}

import { Resend } from 'resend';
import { ScriptData } from './gemini';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

function viewReportBtn(reportUrl: string): string {
  return `
  <div style="text-align:center;margin:28px 0;">
    <a href="${reportUrl}" style="
      display:inline-block;
      background:#00E5FF;
      color:#0B0B0D;
      font-weight:700;
      font-size:15px;
      text-decoration:none;
      padding:14px 32px;
      border-radius:50px;
    ">View in Browser →</a>
    <p style="color:#888;font-size:12px;margin:8px 0 0;">Link stays active — bookmark it.</p>
  </div>`;
}

function scriptEmailHtml(s: ScriptData): string {
  const sectionsHtml = s.sections
    .map(
      (sec) => `
    <div style="margin-bottom:16px;">
      <strong style="font-size:12px;text-transform:uppercase;color:#666;">${sec.heading}</strong><br/>
      <p style="margin:4px 0;">${sec.script}</p>
      <em style="color:#999;font-size:12px;">B-Roll: ${sec.bRollSuggestion}</em>
    </div>`,
    )
    .join('');
  const hashtags = s.hashtags.map((h) => `#${h}`).join(' ');

  return `
  <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;margin:0 0 12px;">
      ${s.totalDurationSeconds}s script
    </p>
    <p style="font-size:18px;font-weight:700;margin:0 0 16px;">"${s.coldOpen}"</p>
    ${sectionsHtml}
    <div style="background:#f9f9f9;padding:14px;border-radius:8px;margin-top:16px;">
      <p style="font-size:12px;color:#666;margin:0 0 6px;font-weight:600;">TELEPROMPTER TEXT</p>
      <p style="margin:0;line-height:1.7;">${s.teleprompterText}</p>
    </div>
    <div style="margin-top:14px;">
      <p style="font-size:12px;color:#666;margin:0 0 4px;font-weight:600;">CAPTION</p>
      <p style="margin:0;">${s.caption}</p>
      <p style="margin:4px 0 0;color:#888;font-size:12px;">${hashtags}</p>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Pack delivery — 5 scripts + browser link
// ---------------------------------------------------------------------------
export async function sendPackDelivery({
  toEmail,
  scripts,
  niche,
  topic,
  reportUrl,
}: {
  toEmail: string;
  scripts: ScriptData[];
  niche: string;
  topic: string;
  reportUrl?: string;
}) {
  const scriptsHtml = scripts.map((s) => scriptEmailHtml(s)).join('');

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your ${scripts.length} ClipScript scripts are ready 🎬`,
    html: `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#111;">
      <h1 style="font-size:24px;margin-bottom:4px;">Your Scripts Are Ready</h1>
      <p style="color:#555;margin-bottom:8px;">
        Niche: <strong>${niche}</strong> — Topic: <strong>${topic || 'general'}</strong>
      </p>
      ${reportUrl ? viewReportBtn(reportUrl) : ''}
      <p style="color:#555;margin-bottom:28px;font-size:14px;">
        Or read them below. Copy the teleprompter text into your camera app and start filming.
        Reply to this email with any adjustments.
      </p>
      ${scriptsHtml}
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="color:#888;font-size:12px;">
        ClipScript — short-form scripts built for filming.<br/>
        Questions? Reply to this email or contact <a href="mailto:hello@clipscriptai.com">hello@clipscriptai.com</a>
      </p>
    </div>`,
  });
}

// ---------------------------------------------------------------------------
// Concierge delivery — sample script + browser link to full brief
// ---------------------------------------------------------------------------
export async function sendConciergeDelivery({
  toEmail,
  sampleScript,
  niche,
  topic,
  reportUrl,
}: {
  toEmail: string;
  sampleScript: ScriptData;
  niche: string;
  topic?: string;
  reportUrl?: string;
}) {
  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your ClipScript Strategy Brief is ready 🎬`,
    html: `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#111;">
      <h1 style="font-size:24px;margin-bottom:8px;">Your Content Strategy Brief is Ready</h1>
      <p style="color:#555;font-size:15px;margin-bottom:4px;">
        We've researched your topic${topic ? ` "<strong>${topic}</strong>"` : ''}, analyzed what's
        performing on YouTube in the <strong>${niche}</strong> space, and built a full content
        strategy document for you.
      </p>
      <p style="color:#555;font-size:14px;margin-bottom:8px;">
        Your brief includes: premise refinement, audience profile, keyword + trend analysis,
        competitive landscape, 8-episode series plan, 12 custom hooks, 2 full scripts, and
        growth projections.
      </p>
      ${reportUrl ? viewReportBtn(reportUrl) : ''}
      <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;" />
      <h2 style="font-size:18px;margin-bottom:4px;">Ready-to-film script</h2>
      <p style="color:#555;font-size:14px;margin-bottom:16px;">
        Film this while you review the full brief.
      </p>
      ${scriptEmailHtml(sampleScript)}
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-top:8px;">
        <p style="font-size:14px;margin:0;">
          <strong>2 tweaks included</strong> — reply to this email with what you'd like adjusted
          (wording, tone, angle). Tweaks = refinements, not full rewrites.
        </p>
      </div>
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="color:#888;font-size:12px;">
        ClipScript — reply here for your tweaks · <a href="mailto:hello@clipscriptai.com">hello@clipscriptai.com</a>
      </p>
    </div>`,
  });
}

// ---------------------------------------------------------------------------
// Failure alert — paid order failed to generate/deliver
// ---------------------------------------------------------------------------
export async function sendFailureAlert({
  orderEmail,
  stripePaymentId,
  orderType,
  niche,
  topic,
  errorMessage,
}: {
  orderEmail: string;
  stripePaymentId: string;
  orderType: string;
  niche: string;
  topic: string;
  errorMessage: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL ?? FROM;
  try {
    await getResend().emails.send({
      from: FROM,
      to: adminEmail,
      subject: `[ClipScript] DELIVERY FAILED — ${orderType} order for ${orderEmail}`,
      html: `
      <p><strong>⚠️ A paid order failed to deliver.</strong></p>
      <p><strong>Customer email:</strong> ${orderEmail}</p>
      <p><strong>Order type:</strong> ${orderType}</p>
      <p><strong>Niche:</strong> ${niche}</p>
      <p><strong>Topic:</strong> ${topic}</p>
      <p><strong>Stripe Payment ID:</strong> ${stripePaymentId}</p>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p style="color:#888;font-size:13px;">The customer was charged but received nothing. Manual delivery or refund required.</p>`,
    });
  } catch (alertErr) {
    console.error('Failed to send failure alert email:', alertErr);
  }
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
  await getResend().emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[ClipScript] New concierge order — ${orderEmail}`,
    html: `
    <p><strong>Order from:</strong> ${orderEmail}</p>
    <p><strong>Niche:</strong> ${niche || 'not specified'}</p>
    <p><strong>Topic/angle:</strong> ${topic || 'not specified'}</p>
    <p><strong>Additional context:</strong> ${brief || 'none'}</p>
    <p><strong>Stripe Payment ID:</strong> ${stripePaymentId}</p>
    <p style="color:#555;font-size:13px;">Brief will be auto-generated with YouTube research and delivered. Customer gets 2 tweaks.</p>`,
  });
}

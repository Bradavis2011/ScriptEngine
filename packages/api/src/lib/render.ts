import { ScriptData } from './gemini';

function scriptCardHtml(s: ScriptData, index: number, total: number): string {
  const sectionsHtml = s.sections
    .map(
      (sec) => `
    <div style="margin-bottom:20px;">
      <p style="font-size:11px;font-weight:700;color:#00E5FF;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 6px;">${sec.heading}</p>
      <p style="margin:0 0 6px;line-height:1.7;">${sec.script}</p>
      <p style="font-size:12px;color:#666;margin:0;">B-Roll: ${sec.bRollSuggestion}</p>
    </div>`,
    )
    .join('');

  const hashtags = s.hashtags.map((h) => `#${h}`).join(' ');

  return `
  <div style="background:#141417;border:1px solid #2A2A2F;border-radius:16px;padding:24px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <span style="font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:0.8px;">Script ${index + 1} of ${total}</span>
      <span style="font-size:12px;color:#666;">${s.totalDurationSeconds}s</span>
    </div>
    <p style="font-size:11px;font-weight:700;color:#00E5FF;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">COLD OPEN</p>
    <p style="font-size:18px;font-weight:700;margin:0 0 20px;line-height:1.5;">"${s.coldOpen}"</p>
    ${sectionsHtml}
    <p style="font-size:11px;font-weight:700;color:#00E5FF;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 6px;">CALL TO ACTION</p>
    <p style="margin:0 0 20px;">${s.callToAction}</p>
    <div style="background:#0B0B0D;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px;">TELEPROMPTER TEXT</p>
      <p style="margin:0;line-height:1.8;font-size:15px;">${s.teleprompterText}</p>
    </div>
    <p style="font-size:11px;font-weight:700;color:#00E5FF;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 6px;">CAPTION</p>
    <p style="margin:0 0 8px;">${s.caption}</p>
    <p style="font-size:13px;color:#666;margin:0;">${hashtags}</p>
  </div>`;
}

export function renderPackReportHtml(
  scripts: ScriptData[],
  niche: string,
  topic: string,
): string {
  const scriptsHtml = scripts.map((s, i) => scriptCardHtml(s, i, scripts.length)).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ClipScript — Your ${scripts.length} Scripts</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#0B0B0D;color:#e5e5e7;margin:0;padding:0;">
  <div style="max-width:720px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:40px;">
      <p style="font-size:11px;font-weight:700;color:#00E5FF;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">ClipScript</p>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 12px;">Your Scripts Are Ready</h1>
      <p style="color:#888;margin:0;font-size:14px;">Niche: <strong style="color:#e5e5e7;">${niche}</strong> &nbsp;·&nbsp; Topic: <strong style="color:#e5e5e7;">${topic || 'general'}</strong></p>
    </div>
    <div style="background:#141417;border:1px solid #2A2A2F;border-radius:12px;padding:16px;margin-bottom:32px;">
      <p style="margin:0;font-size:14px;color:#888;line-height:1.6;">
        Copy the <strong style="color:#e5e5e7;">teleprompter text</strong> into your camera app and start filming.
        Reply to the delivery email with any adjustments.
      </p>
    </div>
    ${scriptsHtml}
    <div style="text-align:center;padding:32px 0;border-top:1px solid #2A2A2F;">
      <p style="color:#888;font-size:13px;margin:0;">ClipScript — short-form scripts built for filming.</p>
      <p style="font-size:13px;margin:4px 0 0;"><a href="mailto:hello@clipscriptai.com" style="color:#00E5FF;">hello@clipscriptai.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

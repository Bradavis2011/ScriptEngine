import 'dotenv/config';
import { createApp } from './app';

// --- Startup env var validation ---
const REQUIRED = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'GEMINI_API_KEY', 'RESEND_API_KEY'];
const RECOMMENDED = ['ADMIN_EMAIL', 'RESEND_FROM_EMAIL', 'ALLOWED_ORIGINS', 'FRONTEND_URL'];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
for (const k of RECOMMENDED) {
  if (!process.env[k]) console.warn(`WARN: Recommended env var not set: ${k}`);
}
// ----------------------------------

const PORT = process.env.PORT ?? 3001;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

try {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`ClipScript API listening on port ${PORT}`);
  });
} catch (err) {
  console.error('FATAL: failed to start app:', err);
  process.exit(1);
}

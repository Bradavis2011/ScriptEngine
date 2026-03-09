import 'dotenv/config';
import { createApp } from './app';

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

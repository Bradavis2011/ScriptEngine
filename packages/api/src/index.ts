import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT ?? 3001;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const app = createApp();

app.listen(PORT, () => {
  console.log(`ClipScript API listening on port ${PORT}`);
});

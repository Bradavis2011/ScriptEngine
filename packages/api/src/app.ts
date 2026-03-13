import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import webhookRouter from './routes/webhooks';
import tenantRouter from './routes/tenants';
import scriptRouter from './routes/scripts';
import seriesRouter from './routes/series';
import checkoutRouter from './routes/checkout';
import reportRouter from './routes/report';
import calibrationRouter from './routes/calibration';
import growthRouter from './growth/routes/growth';
import seoRouter from './routes/seo';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
      credentials: true,
    })
  );

  // Request logging
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Webhooks use raw body for signature verification — mount BEFORE express.json()
  app.use('/webhooks', webhookRouter);

  // JSON body parser for all other routes
  app.use(express.json());

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // API routes
  app.use('/api/tenants', tenantRouter);
  app.use('/api/scripts', scriptRouter);
  app.use('/api/series', seriesRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/report', reportRouter);
  app.use('/api/calibration', calibrationRouter);
  app.use('/api/growth', growthRouter);
  app.use('/api/seo', seoRouter);

  // 404 fallthrough
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

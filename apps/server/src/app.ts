import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { authenticate, requireRole } from './middleware/authenticate';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { assetsPublicRouter } from './modules/assets/assets.routes';
import { authRouter } from './modules/auth/auth.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { productsRouter } from './modules/products/products.routes';
import { publicRouter } from './modules/public/public.routes';
import { quotesRouter } from './modules/quotes/quotes.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { settingsRouter } from './modules/settings/settings.routes';
import { templatesRouter } from './modules/templates/templates.routes';
import { usersRouter } from './modules/users/users.routes';

export function createApp() {
  const app = express();

  // Set TRUST_PROXY=1 when running behind a reverse proxy (Render, Railway, Nginx, Cloudflare…).
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: env.isProduction ? [] : null } },
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  /* ── API ── */
  const api = express.Router();

  api.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });

  api.use('/auth', authRouter);
  api.use('/public', publicRouter);
  api.use('/assets', assetsPublicRouter);

  api.use(authenticate);
  api.use('/users', requireRole('ADMIN'), usersRouter);
  api.use('/customers', customersRouter);
  api.use('/products', productsRouter);
  api.use('/templates', templatesRouter);
  api.use('/settings', settingsRouter);
  api.use('/quotes', quotesRouter);
  api.use('/', reportsRouter);

  app.use('/api', api, notFoundHandler);

  /* ── Built web app (production): same origin as the API, so cookies need no CORS. ── */
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist, { index: false, maxAge: '1h', setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

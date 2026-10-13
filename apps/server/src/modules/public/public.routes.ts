import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { param } from '../../lib/http';
import { buildPdf, loadDocumentData } from '../quotes/quote-documents';
import { assetUrl } from '../assets/assets.routes';
import { getSettings } from '../settings/settings.service';

/** Unauthenticated PDF download for the link inside WhatsApp / email messages. */
export const publicRouter = Router();

publicRouter.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

publicRouter.get('/quotes/:token/pdf', async (req, res) => {
  const data = await loadDocumentData({ shareToken: param(req.params.token) });
  const { buffer, fileName } = await buildPdf(data);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(buffer);
});

/** Just enough company identity for the sign-in screen. */
publicRouter.get('/branding', async (_req, res) => {
  const settings = await getSettings();
  res.json({ companyName: settings.companyName, tagline: settings.tagline, logoUrl: assetUrl(settings.logoId) });
});

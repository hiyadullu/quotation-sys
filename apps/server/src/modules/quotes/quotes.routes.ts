import { Router, type Response } from 'express';
import {
  emailShareSchema,
  quoteCreateSchema,
  quoteListQuerySchema,
  quoteStatusSchema,
  quoteUpdateSchema,
} from '@pool-quote/shared';
import { param, parse } from '../../lib/http';
import { currentUser } from '../../middleware/authenticate';
import { sendMail } from '../../mail/mail.service';
import { buildPdf, buildShareDefaults, loadDocumentData, previewHtml } from './quote-documents';
import {
  accessFilter,
  createDraft,
  deleteDraft,
  duplicateQuote,
  findQuoteOrThrow,
  getQuoteDetail,
  listQuotes,
  recordPdfGenerated,
  recordShare,
  reviseQuote,
  setStatus,
  updateDraft,
} from './quotes.service';

export const quotesRouter = Router();

/** Resolves the quote id after checking the caller may see it, then loads the document data. */
async function documentFor(req: Parameters<typeof currentUser>[0], id: string) {
  const user = currentUser(req);
  await findQuoteOrThrow(id, user);
  return loadDocumentData({ id, ...accessFilter(user) });
}

function sendPdf(res: Response, buffer: Buffer, fileName: string, asAttachment: boolean) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Content-Disposition', `${asAttachment ? 'attachment' : 'inline'}; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(buffer);
}

/* ── CRUD ── */

quotesRouter.get('/', async (req, res) => {
  res.json(await listQuotes(currentUser(req), parse(quoteListQuerySchema, req.query)));
});

quotesRouter.post('/', async (req, res) => {
  const { customerId } = parse(quoteCreateSchema, req.body);
  res.status(201).json(await createDraft(currentUser(req), customerId));
});

quotesRouter.get('/:id', async (req, res) => {
  res.json(await getQuoteDetail(param(req.params.id), currentUser(req)));
});

quotesRouter.put('/:id', async (req, res) => {
  res.json(await updateDraft(param(req.params.id), currentUser(req), parse(quoteUpdateSchema, req.body)));
});

quotesRouter.delete('/:id', async (req, res) => {
  await deleteDraft(param(req.params.id), currentUser(req));
  res.status(204).end();
});

/* ── lifecycle ── */

quotesRouter.post('/:id/duplicate', async (req, res) => {
  res.status(201).json(await duplicateQuote(param(req.params.id), currentUser(req)));
});

quotesRouter.post('/:id/revise', async (req, res) => {
  res.status(201).json(await reviseQuote(param(req.params.id), currentUser(req)));
});

quotesRouter.put('/:id/status', async (req, res) => {
  const { status } = parse(quoteStatusSchema, req.body);
  res.json(await setStatus(param(req.params.id), currentUser(req), status));
});

/* ── document: preview, PDF ── */

quotesRouter.get('/:id/preview', async (req, res) => {
  const data = await documentFor(req, param(req.params.id));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(previewHtml(data));
});

quotesRouter.post('/:id/generate-pdf', async (req, res) => {
  const id = param(req.params.id);
  const data = await documentFor(req, id);
  const { buffer, fileName } = await buildPdf(data);
  await recordPdfGenerated(id, currentUser(req));
  res.json({ fileName, sizeBytes: buffer.length, url: `/api/quotes/${id}/pdf?download=1` });
});

quotesRouter.get('/:id/pdf', async (req, res) => {
  const data = await documentFor(req, param(req.params.id));
  const { buffer, fileName } = await buildPdf(data);
  sendPdf(res, buffer, fileName, req.query.download === '1');
});

/* ── sharing ── */

quotesRouter.get('/:id/share-defaults', async (req, res) => {
  const user = currentUser(req);
  res.json(buildShareDefaults(await documentFor(req, param(req.params.id)), user.name));
});

quotesRouter.post('/:id/share/email', async (req, res) => {
  const id = param(req.params.id);
  const user = currentUser(req);
  const input = parse(emailShareSchema, req.body);

  const data = await documentFor(req, id);
  const { buffer, fileName } = await buildPdf(data);
  await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.body,
    replyTo: data.settings.email,
    attachments: [{ filename: fileName, content: buffer, contentType: 'application/pdf' }],
  });
  await recordShare(id, user, 'EMAIL', `Emailed to ${input.to}`);
  res.json(await getQuoteDetail(id, user));
});

/** WhatsApp opens in the user's own app, so we can only record the intent when they tap the button. */
quotesRouter.post('/:id/share/whatsapp', async (req, res) => {
  const id = param(req.params.id);
  const user = currentUser(req);
  const data = await documentFor(req, id);
  await buildPdf(data); // fail early (422) if the quote isn't ready to be sent
  await recordShare(id, user, 'WHATSAPP', `Shared to ${data.quote.customer.mobile}`);
  res.json(await getQuoteDetail(id, user));
});

import type { Prisma } from '@prisma/client';
import { displayQuoteNumber, formatINR, formatMobile, quoteFileName, quoteIssueProblems, type Milestone, type ShareDefaultsDTO } from '@pool-quote/shared';
import { env } from '../../config/env';
import { formatLongDate } from '../../lib/dates';
import { notFound, unprocessable } from '../../lib/errors';
import { num } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { renderQuoteHtml, type DocumentMode, type QuoteDocumentData } from '../../pdf/quote-document';
import { renderPdf } from '../../pdf/pdf.service';
import { getSettings } from '../settings/settings.service';

async function dataUri(assetId: string | null): Promise<string | null> {
  if (!assetId) return null;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  return asset ? `data:${asset.mimeType};base64,${Buffer.from(asset.data).toString('base64')}` : null;
}

/** Loads everything the quotation document needs. `where` carries the access rule (owner or share token). */
export async function loadDocumentData(where: Prisma.QuoteWhereInput): Promise<QuoteDocumentData> {
  const quote = await prisma.quote.findFirst({
    where,
    include: { items: { orderBy: { position: 'asc' } }, customer: true },
  });
  if (!quote) throw notFound('Quotation');
  const settings = await getSettings();
  const [logoDataUri, signatureDataUri] = await Promise.all([dataUri(settings.logoId), dataUri(settings.signatureId)]);
  return { quote, settings, logoDataUri, signatureDataUri };
}

export const previewHtml = (data: QuoteDocumentData, mode: DocumentMode = 'screen') => renderQuoteHtml(data, mode);

/** Renders the PDF, refusing quotes that are not ready to be issued. */
export async function buildPdf(data: QuoteDocumentData): Promise<{ buffer: Buffer; fileName: string }> {
  const { quote, settings } = data;
  const problems = quoteIssueProblems({ items: quote.items, paymentTerms: (quote.paymentTerms as Milestone[] | null) ?? [] });
  if (problems.length) throw unprocessable(problems[0] as string);

  const label = `${settings.companyName} · Quotation ${displayQuoteNumber(quote.quoteNumber, quote.version)}`;
  const cacheKey = `${quote.id}:${quote.updatedAt.getTime()}:${settings.updatedAt.getTime()}`;
  const buffer = await renderPdf(renderQuoteHtml(data, 'print'), label.replace(/[<>&]/g, ''), cacheKey);
  return { buffer, fileName: quoteFileName(quote.quoteNumber, quote.version, quote.customer.name) };
}

export const publicPdfUrl = (shareToken: string) =>
  `${env.APP_BASE_URL.replace(/\/$/, '')}/api/public/quotes/${shareToken}/pdf`;

/** Default WhatsApp / email wording; the user can edit both before sending. */
export function buildShareDefaults(data: QuoteDocumentData, senderName: string): ShareDefaultsDTO {
  const { quote, settings } = data;
  const number = displayQuoteNumber(quote.quoteNumber, quote.version);
  const total = formatINR(num(quote.total));
  const link = publicPdfUrl(quote.shareToken);
  const validUntil = formatLongDate(quote.validUntil);
  const company = settings.companyName;

  const whatsapp = [
    `Dear ${quote.customer.name},`,
    '',
    `Thank you for your interest in ${company}. Please find your swimming pool quotation ${number} for ${total} (valid until ${validUntil}).`,
    '',
    `View / download the PDF: ${link}`,
    '',
    'Please let us know if you would like any changes.',
    `${senderName}, ${company}`,
  ].join('\n');

  const body = [
    `Dear ${quote.customer.name},`,
    '',
    `Thank you for your interest in ${company}. Please find attached our quotation ${number} dated ${formatLongDate(quote.issueDate)} for ${total}, valid until ${validUntil}.`,
    '',
    `You can also view it online: ${link}`,
    '',
    'Please get in touch if you would like to discuss the scope or pricing.',
    '',
    'Warm regards,',
    senderName,
    company,
    formatMobile(settings.mobile),
  ].join('\n');

  return {
    pdfFileName: quoteFileName(quote.quoteNumber, quote.version, quote.customer.name),
    whatsapp: { phone: quote.customer.mobile.replace(/\D/g, ''), message: whatsapp },
    email: {
      to: quote.customer.email ?? '',
      subject: `Swimming Pool Quotation – ${number}`,
      body,
      smtpConfigured: env.smtpConfigured,
    },
    publicPdfUrl: link,
  };
}

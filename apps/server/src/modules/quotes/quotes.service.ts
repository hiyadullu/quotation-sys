import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { ActivityType, Milestone, QuoteListQuery, QuoteStatus, QuoteUpdateInput } from '@pool-quote/shared';
import { calculateQuote, displayQuoteNumber, quoteIssueProblems } from '@pool-quote/shared';
import { addDays, fromDateString, todayIST } from '../../lib/dates';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors';
import { emptyToNull } from '../../lib/http';
import { prisma, type Tx } from '../../lib/prisma';
import type { AuthUser } from '../../middleware/authenticate';
import { getSettings } from '../settings/settings.service';
import { nextQuoteNumber } from './quote-number';
import {
  detailInclude,
  quotePricingInput,
  summaryInclude,
  toDetailDTO,
  toSummaryDTO,
  type QuoteWithDetail,
} from './quotes.mapper';

const newShareToken = () => randomBytes(24).toString('base64url');

/** Sales executives see their own quotations; admins see everything. */
export const accessFilter = (user: AuthUser): Prisma.QuoteWhereInput => (user.role === 'ADMIN' ? {} : { createdById: user.id });

async function logActivity(tx: Tx | typeof prisma, quoteId: string, userId: string, type: ActivityType, note?: string) {
  await tx.quoteActivity.create({ data: { quoteId, userId, type, note: note ?? null } });
}

export async function findQuoteOrThrow(id: string, user: AuthUser): Promise<QuoteWithDetail> {
  const quote = await prisma.quote.findFirst({ where: { id, ...accessFilter(user) }, include: detailInclude });
  if (!quote) throw notFound('Quotation');
  return quote;
}

async function versionsOf(quoteNumber: string) {
  return prisma.quote.findMany({
    where: { quoteNumber },
    select: { id: true, version: true, status: true, createdAt: true },
    orderBy: { version: 'desc' },
  });
}

export async function getQuoteDetail(id: string, user: AuthUser) {
  const quote = await findQuoteOrThrow(id, user);
  return toDetailDTO(quote, await versionsOf(quote.quoteNumber));
}

/* ────────────────────────────── list ────────────────────────────── */

const DATE_PATTERNS = [
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: [1, 2, 3] as const },
  { regex: /^(\d{2})[-/.](\d{2})[-/.](\d{4})$/, order: [3, 2, 1] as const },
];

/** Accepts 2026-10-08 or 08-10-2026 (also with / or .) and returns a date, else null. */
function parseSearchDate(text: string): Date | null {
  for (const { regex, order } of DATE_PATTERNS) {
    const m = regex.exec(text);
    if (!m) continue;
    const [y, mo, d] = order.map((i) => m[i] as string);
    const date = new Date(`${y}-${mo}-${d}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export async function listQuotes(user: AuthUser, query: QuoteListQuery) {
  const { search, status, from, to, page, pageSize } = query;
  const where: Prisma.QuoteWhereInput = { isLatest: true, ...accessFilter(user) };
  if (status) where.status = status;
  if (from || to) {
    where.issueDate = { ...(from ? { gte: fromDateString(from) } : {}), ...(to ? { lte: fromDateString(to) } : {}) };
  }

  if (search) {
    const digits = search.replace(/\D/g, '');
    const date = parseSearchDate(search);
    where.AND = [
      {
        OR: [
          { quoteNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          ...(digits.length >= 3 ? [{ customer: { mobile: { contains: digits } } }] : []),
          ...(date ? [{ issueDate: date }] : []),
        ],
      },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: summaryInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quote.count({ where }),
  ]);
  return { data: rows.map(toSummaryDTO), page, pageSize, total };
}

/* ────────────────────────── create / copy ────────────────────────── */

async function defaultsFromTemplates() {
  const templates = await prisma.template.findMany({ where: { isDefault: true } });
  const byKind = (kind: string) => templates.find((t) => t.kind === kind);
  return {
    scope: byKind('SCOPE')?.body ?? '',
    terms: byKind('TERMS')?.body ?? '',
    paymentTerms: (byKind('PAYMENT')?.milestones as Milestone[] | null) ?? [],
  };
}

export async function createDraft(user: AuthUser, customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw badRequest('Selected customer no longer exists.');

  const [settings, defaults] = await Promise.all([getSettings(), defaultsFromTemplates()]);
  const today = todayIST();

  const id = await prisma.$transaction(async (tx) => {
    const quoteNumber = await nextQuoteNumber(tx, settings.quotePrefix, today.getUTCFullYear());
    const quote = await tx.quote.create({
      data: {
        quoteNumber,
        customerId,
        createdById: user.id,
        issueDate: today,
        validUntil: addDays(today, settings.validityDays),
        siteAddress: customer.siteAddress,
        otherChargesGstPercent: settings.defaultGstPercent,
        scope: defaults.scope,
        paymentTerms: defaults.paymentTerms,
        terms: defaults.terms,
        warranty: settings.defaultWarranty,
        shareToken: newShareToken(),
      },
      select: { id: true },
    });
    await logActivity(tx, quote.id, user.id, 'CREATED');
    return quote.id;
  });
  return getQuoteDetail(id, user);
}

/** Copies the commercial content of a quote into a brand-new draft row. */
function copyData(source: QuoteWithDetail, today: Date, validityDays: number) {
  return {
    customerId: source.customerId,
    createdById: source.createdById,
    issueDate: today,
    validUntil: addDays(today, validityDays),
    siteAddress: source.siteAddress,
    discountType: source.discountType,
    discountValue: source.discountValue,
    otherCharges: source.otherCharges,
    otherChargesGstPercent: source.otherChargesGstPercent,
    scope: source.scope,
    paymentTerms: source.paymentTerms ?? [],
    terms: source.terms,
    warranty: source.warranty,
    subtotal: source.subtotal,
    discountAmount: source.discountAmount,
    taxableAmount: source.taxableAmount,
    gstAmount: source.gstAmount,
    total: source.total,
    shareToken: newShareToken(),
    items: {
      create: source.items.map((item, position) => ({
        position,
        productId: item.productId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        gstPercent: item.gstPercent,
      })),
    },
  } satisfies Omit<Prisma.QuoteUncheckedCreateInput, 'quoteNumber'>;
}

export async function duplicateQuote(id: string, user: AuthUser) {
  const source = await findQuoteOrThrow(id, user);
  const settings = await getSettings();
  const today = todayIST();

  const newId = await prisma.$transaction(async (tx) => {
    const quoteNumber = await nextQuoteNumber(tx, settings.quotePrefix, today.getUTCFullYear());
    const copy = await tx.quote.create({
      data: { ...copyData(source, today, settings.validityDays), createdById: user.id, quoteNumber },
      select: { id: true },
    });
    await logActivity(tx, copy.id, user.id, 'DUPLICATED', `Copied from ${displayQuoteNumber(source.quoteNumber, source.version)}`);
    return copy.id;
  });
  return getQuoteDetail(newId, user);
}

/** Creates the next version (V2, V3 …) of the same quotation number and keeps earlier versions intact. */
export async function reviseQuote(id: string, user: AuthUser) {
  const source = await findQuoteOrThrow(id, user);
  if (source.status === 'DRAFT') throw conflict('This quotation is still a draft — edit it directly.');
  if (!source.isLatest) throw conflict('Only the latest version can be revised.');
  const settings = await getSettings();
  const today = todayIST();

  const newId = await prisma.$transaction(async (tx) => {
    const latest = await tx.quote.aggregate({ where: { quoteNumber: source.quoteNumber }, _max: { version: true } });
    const version = (latest._max.version ?? source.version) + 1;
    await tx.quote.update({ where: { id: source.id }, data: { isLatest: false } });
    const revision = await tx.quote.create({
      data: {
        ...copyData(source, today, settings.validityDays),
        quoteNumber: source.quoteNumber,
        version,
        isLatest: true,
      },
      select: { id: true },
    });
    await logActivity(tx, revision.id, user.id, 'REVISED', `Revised from V${source.version}`);
    return revision.id;
  });
  return getQuoteDetail(newId, user);
}

/* ───────────────────────────── update ───────────────────────────── */

export async function updateDraft(id: string, user: AuthUser, input: QuoteUpdateInput) {
  const quote = await findQuoteOrThrow(id, user);
  if (quote.status !== 'DRAFT') {
    throw conflict('Only draft quotations can be edited. Use "Revise" to create a new version.');
  }
  if (input.validUntil < input.issueDate) throw badRequest('"Valid until" cannot be before the quotation date.');

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
  if (!customer) throw badRequest('Selected customer no longer exists.');

  // Forget product links that no longer exist rather than failing the whole save.
  const productIds = [...new Set(input.items.map((i) => i.productId).filter((v): v is string => !!v))];
  const knownProducts = new Set(
    (await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } })).map((p) => p.id),
  );

  const totals = calculateQuote({
    items: input.items,
    discountType: input.discountType,
    discountValue: input.discountValue,
    otherCharges: input.otherCharges,
    otherChargesGstPercent: input.otherChargesGstPercent,
  });

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        customerId: input.customerId,
        issueDate: fromDateString(input.issueDate),
        validUntil: fromDateString(input.validUntil),
        siteAddress: emptyToNull(input.siteAddress),
        discountType: input.discountType,
        discountValue: input.discountValue,
        otherCharges: input.otherCharges,
        otherChargesGstPercent: input.otherChargesGstPercent,
        scope: input.scope?.trim() ?? '',
        paymentTerms: input.paymentTerms,
        terms: input.terms?.trim() ?? '',
        warranty: emptyToNull(input.warranty),
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxableAmount: totals.taxableAmount,
        gstAmount: totals.gstAmount,
        total: totals.grandTotal,
        items: {
          create: input.items.map((item, position) => ({
            position,
            productId: item.productId && knownProducts.has(item.productId) ? item.productId : null,
            name: item.name,
            description: emptyToNull(item.description),
            unit: item.unit,
            quantity: item.quantity,
            rate: item.rate,
            gstPercent: item.gstPercent,
          })),
        },
      },
    });
  });
  return getQuoteDetail(id, user);
}

export async function deleteDraft(id: string, user: AuthUser) {
  const quote = await findQuoteOrThrow(id, user);
  if (quote.status !== 'DRAFT') throw conflict('Only draft quotations can be deleted.');
  if (quote.version > 1) {
    // Deleting a draft revision re-opens the previous version as the latest.
    await prisma.$transaction([
      prisma.quote.delete({ where: { id } }),
      prisma.quote.updateMany({ where: { quoteNumber: quote.quoteNumber, version: quote.version - 1 }, data: { isLatest: true } }),
    ]);
    return;
  }
  await prisma.quote.delete({ where: { id } });
}

/* ───────────────────────────── status ───────────────────────────── */

export async function setStatus(id: string, user: AuthUser, next: Exclude<QuoteStatus, 'DRAFT'>) {
  const quote = await findQuoteOrThrow(id, user);
  if (quote.status === next) return getQuoteDetail(id, user);

  if (quote.status === 'DRAFT') {
    if (next !== 'SENT') throw conflict('A draft must be sent before it can be accepted or rejected.');
    const problems = quoteIssueProblems({ items: quote.items, paymentTerms: (quote.paymentTerms as Milestone[]) ?? [] });
    if (problems.length) throw unprocessable(problems[0] as string);
  }

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id },
      data: {
        status: next,
        sentAt: quote.sentAt ?? new Date(),
        respondedAt: next === 'SENT' ? null : new Date(),
      },
    });
    await logActivity(tx, id, user.id, 'STATUS_CHANGED', `${quote.status} → ${next}`);
  });
  return getQuoteDetail(id, user);
}

/** Called after an email is delivered or the user taps WhatsApp. Drafts become "Sent". */
export async function recordShare(id: string, user: AuthUser, channel: 'EMAIL' | 'WHATSAPP', note?: string) {
  const quote = await findQuoteOrThrow(id, user);
  await prisma.$transaction(async (tx) => {
    if (quote.status === 'DRAFT') {
      await tx.quote.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
    } else if (!quote.sentAt) {
      await tx.quote.update({ where: { id }, data: { sentAt: new Date() } });
    }
    await logActivity(tx, id, user.id, channel === 'EMAIL' ? 'SENT_EMAIL' : 'SENT_WHATSAPP', note);
  });
}

export async function recordPdfGenerated(id: string, user: AuthUser) {
  await logActivity(prisma, id, user.id, 'PDF_GENERATED');
}


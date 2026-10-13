import type { Prisma } from '@prisma/client';
import type { Milestone, QuoteDTO, QuoteSummaryDTO } from '@pool-quote/shared';
import { calculateQuote, displayQuoteNumber, quoteIssueProblems } from '@pool-quote/shared';
import { toDateString } from '../../lib/dates';
import { num } from '../../lib/http';

export const summaryInclude = {
  customer: { select: { id: true, name: true, mobile: true, email: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.QuoteInclude;

export const detailInclude = {
  ...summaryInclude,
  items: { orderBy: { position: 'asc' } },
  activities: { orderBy: { createdAt: 'desc' }, take: 40, include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.QuoteInclude;

export type QuoteWithSummary = Prisma.QuoteGetPayload<{ include: typeof summaryInclude }>;
export type QuoteWithDetail = Prisma.QuoteGetPayload<{ include: typeof detailInclude }>;

export function toSummaryDTO(q: QuoteWithSummary): QuoteSummaryDTO {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    version: q.version,
    displayNumber: displayQuoteNumber(q.quoteNumber, q.version),
    isLatest: q.isLatest,
    status: q.status,
    customer: q.customer,
    createdBy: q.createdBy,
    total: num(q.total),
    issueDate: toDateString(q.issueDate),
    validUntil: toDateString(q.validUntil),
    sentAt: q.sentAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export function quotePricingInput(q: Pick<QuoteWithDetail, 'items' | 'discountType' | 'discountValue' | 'otherCharges' | 'otherChargesGstPercent'>) {
  return {
    items: q.items.map((i) => ({ quantity: num(i.quantity), rate: num(i.rate), gstPercent: num(i.gstPercent) })),
    discountType: q.discountType,
    discountValue: num(q.discountValue),
    otherCharges: num(q.otherCharges),
    otherChargesGstPercent: num(q.otherChargesGstPercent),
  };
}

export function toDetailDTO(
  q: QuoteWithDetail,
  versions: { id: string; version: number; status: QuoteDTO['status']; createdAt: Date }[],
): QuoteDTO {
  const totals = calculateQuote(quotePricingInput(q));
  const paymentTerms = (q.paymentTerms as Milestone[] | null) ?? [];

  return {
    ...toSummaryDTO(q),
    siteAddress: q.siteAddress,
    discountType: q.discountType,
    discountValue: num(q.discountValue),
    otherCharges: num(q.otherCharges),
    otherChargesGstPercent: num(q.otherChargesGstPercent),
    scope: q.scope,
    paymentTerms,
    terms: q.terms,
    warranty: q.warranty,
    items: q.items.map((item, index) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      description: item.description,
      unit: item.unit,
      quantity: num(item.quantity),
      rate: num(item.rate),
      gstPercent: num(item.gstPercent),
      amount: totals.lineAmounts[index] ?? 0,
    })),
    totals,
    versions: versions.map((v) => ({ id: v.id, version: v.version, status: v.status, createdAt: v.createdAt.toISOString() })),
    activities: q.activities.map((a) => ({
      id: a.id,
      type: a.type,
      note: a.note,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
    })),
    issueProblems: quoteIssueProblems({ items: q.items, paymentTerms }),
  };
}

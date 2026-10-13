import type { Milestone } from './schemas';

interface IssueCheckInput {
  items: unknown[];
  paymentTerms: Milestone[];
  customerMobile?: string | null;
}

/**
 * Rules that must hold before a quote can be previewed as final, turned into a PDF or shared.
 * Drafts can be saved incomplete; this is the gate for everything after that.
 */
export function quoteIssueProblems(quote: IssueCheckInput): string[] {
  const problems: string[] = [];
  if (quote.items.length === 0) problems.push('Add at least one item to the quotation.');
  if (quote.paymentTerms.length > 0) {
    const total = quote.paymentTerms.reduce((sum, m) => sum + m.percent, 0);
    if (Math.abs(total - 100) > 0.01) problems.push(`Payment milestones add up to ${total}% — they must total 100%.`);
  }
  return problems;
}

export function quoteFileName(quoteNumber: string, version: number, customerName: string): string {
  const safeName = customerName.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Customer';
  const versionSuffix = version > 1 ? `_V${version}` : '';
  return `Quotation_${quoteNumber}${versionSuffix}_${safeName}.pdf`;
}

export function displayQuoteNumber(quoteNumber: string, version: number): string {
  return version > 1 ? `${quoteNumber} V${version}` : quoteNumber;
}

import type { Tx } from '../../lib/prisma';

/**
 * Hands out the next quotation number, e.g. QT-2026-00125.
 * The counter row is incremented with a single atomic UPDATE, so two people creating
 * quotes at the same moment can never receive the same number.
 */
export async function nextQuoteNumber(tx: Tx, prefix: string, year: number): Promise<string> {
  const counter = await tx.quoteCounter.upsert({
    where: { year },
    create: { year, last: 1 },
    update: { last: { increment: 1 } },
    select: { last: true },
  });
  return `${prefix}-${year}-${String(counter.last).padStart(5, '0')}`;
}

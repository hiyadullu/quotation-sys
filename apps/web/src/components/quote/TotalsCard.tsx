import { calculateQuote, type DiscountType } from '@pool-quote/shared';
import { useMemo } from 'react';
import { formatINR } from '@pool-quote/shared';
import { cn } from '@/lib/cn';

interface TotalsCardProps {
  items: { quantity: number; rate: number; gstPercent: number }[];
  discountType: DiscountType;
  discountValue: number;
  otherCharges: number;
  otherChargesGstPercent: number;
  className?: string;
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export function useTotals(props: Omit<TotalsCardProps, 'className'>) {
  const { items, discountType, discountValue, otherCharges, otherChargesGstPercent } = props;
  return useMemo(
    () =>
      calculateQuote({
        items: items.map((i) => ({ quantity: safe(i.quantity), rate: safe(i.rate), gstPercent: safe(i.gstPercent) })),
        discountType,
        discountValue: safe(discountValue),
        otherCharges: safe(otherCharges),
        otherChargesGstPercent: safe(otherChargesGstPercent),
      }),
    [items, discountType, discountValue, otherCharges, otherChargesGstPercent],
  );
}

/** Live price summary that mirrors exactly what the PDF will show. */
export function TotalsCard({ className, ...input }: TotalsCardProps) {
  const t = useTotals(input);
  const row = (label: string, value: string, muted = false) => (
    <div className={cn('flex justify-between gap-4 py-1.5 text-[15px]', muted && 'text-sm text-ink-muted')}>
      <dt>{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );

  return (
    <div className={cn('card p-5', className)}>
      <h2 className="mb-2 text-base font-bold">Price summary</h2>
      <dl className="divide-y divide-surface-line/70">
        <div>{row('Subtotal', formatINR(t.subtotal, 2))}</div>
        {t.discountAmount > 0 && <div>{row('Discount', `− ${formatINR(t.discountAmount, 2)}`)}</div>}
        {t.otherCharges > 0 && <div>{row('Transport / other', formatINR(t.otherCharges, 2))}</div>}
        <div>
          {row('Taxable amount', formatINR(t.taxableAmount, 2))}
          {t.gstBreakup.filter((g) => g.gstAmount > 0).map((g) => row(`GST @ ${g.rate}%`, formatINR(g.gstAmount, 2), true))}
        </div>
      </dl>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-900 px-4 py-3 text-white">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-100">Grand total</span>
        <span className="tabular text-xl font-extrabold">{formatINR(t.grandTotal, 2)}</span>
      </div>
    </div>
  );
}

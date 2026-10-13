import type { DiscountType } from './enums';
import { fromPaise, toPaise } from './money';

export interface PricingItemInput {
  quantity: number;
  rate: number;
  gstPercent: number;
}

export interface PricingInput {
  items: PricingItemInput[];
  discountType: DiscountType;
  discountValue: number;
  /** Transportation / other charges, taxed at `otherChargesGstPercent`. */
  otherCharges: number;
  otherChargesGstPercent: number;
}

export interface GstBreakupRow {
  rate: number;
  taxableAmount: number;
  gstAmount: number;
}

export interface QuoteTotals {
  /** Per input item, same order: quantity × rate. */
  lineAmounts: number[];
  subtotal: number;
  discountAmount: number;
  otherCharges: number;
  /** Amount on which GST is charged (subtotal − discount + other charges). */
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  gstBreakup: GstBreakupRow[];
}

/**
 * Pricing rules (matches the scope document example: ₹2,31,000 − ₹10,000 discount, 18% GST on
 * ₹2,21,000 = ₹39,780, total ₹2,60,780):
 *
 *  1. line amount = quantity × rate
 *  2. discount is applied to the subtotal and spread pro-rata across lines, so items with
 *     different GST rates are each taxed on their *discounted* value
 *  3. transport / other charges are added after the discount and taxed at their own rate
 *  4. every rupee figure is computed in integer paise and rounded half-up per line
 */
export function calculateQuote(input: PricingInput): QuoteTotals {
  const lines = input.items.map((item) => {
    const qtyMilli = Math.round(item.quantity * 1000);
    const ratePaise = toPaise(item.rate);
    return { amount: Math.round((qtyMilli * ratePaise) / 1000), gstPercent: item.gstPercent };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);

  const rawDiscount =
    input.discountType === 'PERCENT'
      ? Math.round((subtotal * Math.min(Math.max(input.discountValue, 0), 100)) / 100)
      : toPaise(Math.max(input.discountValue, 0));
  const discount = Math.min(rawDiscount, subtotal);

  // Spread the discount over the lines; the last line absorbs any rounding remainder.
  let allocated = 0;
  const taxable = lines.map((line, index) => {
    const isLast = index === lines.length - 1;
    const share = isLast || subtotal === 0 ? discount - allocated : Math.floor((discount * line.amount) / subtotal);
    allocated += share;
    return line.amount - share;
  });

  const buckets = new Map<number, { taxable: number; gst: number }>();
  const addToBucket = (rate: number, taxableAmount: number) => {
    const gst = Math.round((taxableAmount * rate) / 100);
    const bucket = buckets.get(rate) ?? { taxable: 0, gst: 0 };
    bucket.taxable += taxableAmount;
    bucket.gst += gst;
    buckets.set(rate, bucket);
  };

  lines.forEach((line, i) => addToBucket(line.gstPercent, taxable[i] ?? 0));

  const otherCharges = toPaise(Math.max(input.otherCharges, 0));
  if (otherCharges > 0) addToBucket(input.otherChargesGstPercent, otherCharges);

  const gstBreakup = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, b]) => ({ rate, taxableAmount: fromPaise(b.taxable), gstAmount: fromPaise(b.gst) }));

  const taxableTotal = subtotal - discount + otherCharges;
  const gstTotal = [...buckets.values()].reduce((sum, b) => sum + b.gst, 0);

  return {
    lineAmounts: lines.map((l) => fromPaise(l.amount)),
    subtotal: fromPaise(subtotal),
    discountAmount: fromPaise(discount),
    otherCharges: fromPaise(otherCharges),
    taxableAmount: fromPaise(taxableTotal),
    gstAmount: fromPaise(gstTotal),
    grandTotal: fromPaise(taxableTotal + gstTotal),
    gstBreakup,
  };
}

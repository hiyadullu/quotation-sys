import { describe, expect, it } from 'vitest';
import {
  amountInWords,
  calculateQuote,
  customerSchema,
  formatINR,
  formatINRCompact,
  normalizeMobile,
  quoteFileName,
  quoteIssueProblems,
  templateSchema,
} from '../src';

describe('calculateQuote', () => {
  it('reproduces the worked example from the scope document', () => {
    const totals = calculateQuote({
      items: [
        { quantity: 1, rate: 35000, gstPercent: 18 },
        { quantity: 1, rate: 42000, gstPercent: 18 },
        { quantity: 6, rate: 6500, gstPercent: 18 },
        { quantity: 1, rate: 75000, gstPercent: 18 },
        { quantity: 1, rate: 40000, gstPercent: 18 },
      ],
      discountType: 'AMOUNT',
      discountValue: 10000,
      otherCharges: 0,
      otherChargesGstPercent: 18,
    });
    expect(totals.subtotal).toBe(231000);
    expect(totals.gstAmount).toBe(39780);
    expect(totals.grandTotal).toBe(260780);
    expect(totals.lineAmounts).toEqual([35000, 42000, 39000, 75000, 40000]);
  });

  it('taxes each line on its discounted value when GST rates differ', () => {
    const totals = calculateQuote({
      items: [
        { quantity: 1, rate: 1000, gstPercent: 18 },
        { quantity: 1, rate: 1000, gstPercent: 5 },
      ],
      discountType: 'PERCENT',
      discountValue: 10,
      otherCharges: 0,
      otherChargesGstPercent: 18,
    });
    expect(totals.discountAmount).toBe(200);
    expect(totals.gstBreakup).toEqual([
      { rate: 5, taxableAmount: 900, gstAmount: 45 },
      { rate: 18, taxableAmount: 900, gstAmount: 162 },
    ]);
    expect(totals.grandTotal).toBe(1800 + 207);
  });

  it('adds transport charges after the discount with their own GST', () => {
    const totals = calculateQuote({
      items: [{ quantity: 2, rate: 500, gstPercent: 18 }],
      discountType: 'AMOUNT',
      discountValue: 100,
      otherCharges: 1000,
      otherChargesGstPercent: 18,
    });
    expect(totals.taxableAmount).toBe(1900);
    expect(totals.gstAmount).toBe(342);
    expect(totals.grandTotal).toBe(2242);
  });

  it('never lets the discount exceed the subtotal and handles an empty quote', () => {
    const over = calculateQuote({
      items: [{ quantity: 1, rate: 500, gstPercent: 18 }],
      discountType: 'AMOUNT',
      discountValue: 9999,
      otherCharges: 0,
      otherChargesGstPercent: 18,
    });
    expect(over.discountAmount).toBe(500);
    expect(over.grandTotal).toBe(0);

    const empty = calculateQuote({ items: [], discountType: 'AMOUNT', discountValue: 0, otherCharges: 0, otherChargesGstPercent: 18 });
    expect(empty.grandTotal).toBe(0);
  });

  it('avoids floating point drift with fractional quantities and rates', () => {
    const totals = calculateQuote({
      items: [{ quantity: 0.1, rate: 0.2, gstPercent: 0 }, { quantity: 3.333, rate: 99.99, gstPercent: 0 }],
      discountType: 'AMOUNT',
      discountValue: 0,
      otherCharges: 0,
      otherChargesGstPercent: 0,
    });
    expect(totals.lineAmounts).toEqual([0.02, 333.27]);
    expect(totals.subtotal).toBe(333.29);
  });

  it('spreads odd discounts without losing a paisa', () => {
    const totals = calculateQuote({
      items: [
        { quantity: 1, rate: 100, gstPercent: 0 },
        { quantity: 1, rate: 100, gstPercent: 0 },
        { quantity: 1, rate: 100, gstPercent: 0 },
      ],
      discountType: 'AMOUNT',
      discountValue: 0.01,
      otherCharges: 0,
      otherChargesGstPercent: 0,
    });
    expect(totals.grandTotal).toBe(299.99);
  });
});

describe('money formatting', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(260780)).toBe('₹2,60,780');
    expect(formatINR(1234567.5)).toBe('₹12,34,567.50');
    expect(formatINR(500, 2)).toBe('₹500.00');
    expect(formatINRCompact(261000)).toBe('₹2.61L');
    expect(formatINRCompact(12500000)).toBe('₹1.25Cr');
  });

  it('writes amounts in words', () => {
    expect(amountInWords(260780)).toBe('Two Lakh Sixty Thousand Seven Hundred Eighty Rupees Only');
    expect(amountInWords(100)).toBe('One Hundred Rupees Only');
    expect(amountInWords(12345.5)).toBe('Twelve Thousand Three Hundred Forty Five Rupees and Fifty Paise Only');
    expect(amountInWords(0)).toBe('Zero Rupees Only');
    expect(amountInWords(25000000)).toBe('Two Crore Fifty Lakh Rupees Only');
  });
});

describe('normalizeMobile', () => {
  it('normalises Indian numbers to E.164', () => {
    expect(normalizeMobile('98765 43210')).toBe('+919876543210');
    expect(normalizeMobile('+91 98765-43210')).toBe('+919876543210');
    expect(normalizeMobile('09876543210')).toBe('+919876543210');
    expect(normalizeMobile('919876543210')).toBe('+919876543210');
  });
  it('rejects junk', () => {
    expect(normalizeMobile('12345')).toBeNull();
    expect(normalizeMobile('5876543210')).toBeNull();
    expect(normalizeMobile('')).toBeNull();
  });
});

describe('schemas and rules', () => {
  it('validates customers', () => {
    expect(customerSchema.safeParse({ name: 'Rajesh Sharma', mobile: '9876543210', email: '' }).success).toBe(true);
    expect(customerSchema.safeParse({ name: '', mobile: '9876543210' }).success).toBe(false);
    expect(customerSchema.safeParse({ name: 'A', mobile: '123' }).success).toBe(false);
    expect(customerSchema.safeParse({ name: 'A', mobile: '9876543210', gstin: '22AAAAA0000A1Z5' }).success).toBe(true);
    expect(customerSchema.safeParse({ name: 'A', mobile: '9876543210', gstin: 'nope' }).success).toBe(false);
  });

  it('requires payment milestones to total 100%', () => {
    const base = { kind: 'PAYMENT' as const, name: 'Std', isDefault: false };
    expect(templateSchema.safeParse({ ...base, milestones: [{ label: 'A', percent: 60 }, { label: 'B', percent: 40 }] }).success).toBe(true);
    expect(templateSchema.safeParse({ ...base, milestones: [{ label: 'A', percent: 60 }] }).success).toBe(false);
  });

  it('flags quotes that cannot be issued yet', () => {
    expect(quoteIssueProblems({ items: [], paymentTerms: [] })).toHaveLength(1);
    expect(quoteIssueProblems({ items: [{}], paymentTerms: [{ label: 'x', percent: 90 }] })).toHaveLength(1);
    expect(quoteIssueProblems({ items: [{}], paymentTerms: [{ label: 'x', percent: 100 }] })).toHaveLength(0);
  });

  it('builds the PDF filename from the scope document', () => {
    expect(quoteFileName('QT-2026-00125', 1, 'Rajesh Sharma')).toBe('Quotation_QT-2026-00125_Rajesh_Sharma.pdf');
    expect(quoteFileName('QT-2026-00125', 2, 'Rajesh Sharma')).toBe('Quotation_QT-2026-00125_V2_Rajesh_Sharma.pdf');
  });
});

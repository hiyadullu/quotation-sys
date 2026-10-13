import { describe, expect, it } from 'vitest';
import { renderQuoteHtml, type QuoteDocumentData } from '../src/pdf/quote-document';

const dec = (n: number) => n as never; // the renderer only calls Number() on Prisma decimals

function sample(overrides: { customerName?: string; scope?: string } = {}): QuoteDocumentData {
  return {
    logoDataUri: null,
    signatureDataUri: null,
    settings: {
      companyName: 'ABC Pools', tagline: null, address: '12 Lake Road', city: 'Bhopal', state: null, pincode: null,
      gstin: null, mobile: '+919000000000', email: 'info@abc.test', website: null, bankName: null, accountName: null,
      accountNumber: null, ifsc: null, bankBranch: null, upiId: null, signatoryName: null, signatoryTitle: null,
    } as never,
    quote: {
      id: 'q1', quoteNumber: 'QT-2026-00125', version: 2, issueDate: new Date('2026-10-08T00:00:00Z'), validUntil: new Date('2026-10-23T00:00:00Z'),
      siteAddress: null, discountType: 'AMOUNT', discountValue: dec(10000), otherCharges: dec(0), otherChargesGstPercent: dec(18),
      scope: overrides.scope ?? 'Supply and install.', terms: '1. First clause\n- Second clause', warranty: null,
      paymentTerms: [{ label: 'Advance', percent: 60 }, { label: 'Handover', percent: 40 }],
      customer: { name: overrides.customerName ?? 'Rajesh Sharma', mobile: '+919811111111', email: null, address: null, city: null, gstin: null },
      items: [
        { name: 'Pump', description: null, unit: 'Nos', quantity: dec(1), rate: dec(231000), gstPercent: dec(18) },
      ],
    } as never,
  };
}

describe('renderQuoteHtml', () => {
  it('prints the agreed totals, number and amount in words', () => {
    const html = renderQuoteHtml(sample(), 'print');
    expect(html).toContain('QT-2026-00125 V2');
    expect(html).toContain('₹2,60,780.00');
    expect(html).toContain('Two Lakh Sixty Thousand Seven Hundred Eighty Rupees Only');
    expect(html).toContain('₹1,56,468.00'); // 60% milestone
  });

  it('strips hand-typed numbering from clauses', () => {
    const html = renderQuoteHtml(sample(), 'print');
    expect(html).toContain('<li>First clause</li>');
    expect(html).toContain('<li>Second clause</li>');
  });

  it('escapes user-supplied text so it cannot inject markup', () => {
    const html = renderQuoteHtml(sample({ customerName: '<img src=x onerror=alert(1)>', scope: '<script>alert(1)</script>' }), 'print');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('switches to the on-screen layout for previews', () => {
    expect(renderQuoteHtml(sample(), 'screen')).toContain('<body class="screen">');
  });
});

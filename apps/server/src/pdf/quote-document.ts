import type { Customer, Quote, QuoteItem, Settings } from '@prisma/client';
import type { Milestone } from '@pool-quote/shared';
import {
  amountInWords,
  calculateQuote,
  displayQuoteNumber,
  formatINR,
  formatMobile,
} from '@pool-quote/shared';
import { formatLongDate } from '../lib/dates';
import { num } from '../lib/http';
import { quotePricingInput } from '../modules/quotes/quotes.mapper';
import { embeddedFontCss } from './fonts';

export interface QuoteDocumentData {
  quote: Quote & { items: QuoteItem[]; customer: Customer };
  settings: Settings;
  /** Data URIs, so the PDF renderer never needs network access. */
  logoDataUri: string | null;
  signatureDataUri: string | null;
}

export type DocumentMode = 'print' | 'screen';

const escapeHtml = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (amount: number) => formatINR(amount, 2);
const percent = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
const qty = (value: number) => (Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3))));

/** One clause per line; any hand-typed bullets or numbers are stripped because we number them. */
function clauses(text: string | null): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function addressLines(...parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => !!p && p.trim() !== '')
    .map((p) => `<div>${escapeHtml(p)}</div>`)
    .join('');
}

const CSS = `
  :root{--ink:#14202e;--muted:#5d6b7a;--line:#d8e2ea;--soft:#f3f8fb;--brand:#0c6aa6;--brand-dark:#0a2540;--aqua:#14a9c0;}
  *{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:9.6pt;line-height:1.5;color:var(--ink);background:#fff;font-variant-numeric:tabular-nums}
  body.screen .sheet{width:794px;padding:44px 46px}
  .num{text-align:right;white-space:nowrap}
  header.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:16px;border-bottom:3px solid var(--brand)}
  .brand{display:flex;gap:14px;align-items:center}
  .brand img{max-height:62px;max-width:150px;object-fit:contain}
  .brand .name{font-size:17pt;font-weight:700;color:var(--brand-dark);letter-spacing:-.01em;line-height:1.15}
  .brand .tag{color:var(--muted);font-size:8.6pt;margin-top:2px}
  .contact{text-align:right;font-size:8.6pt;color:var(--muted);line-height:1.55}
  .contact strong{color:var(--ink);font-weight:600}
  .title-row{display:flex;justify-content:space-between;align-items:flex-end;margin:20px 0 14px}
  .title{font-size:20pt;font-weight:700;letter-spacing:.08em;color:var(--brand-dark)}
  .meta{display:grid;grid-template-columns:auto auto;gap:3px 18px;font-size:9pt}
  .meta dt{color:var(--muted)} .meta dd{font-weight:600;text-align:right}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
  .card{border:1px solid var(--line);border-radius:6px;padding:11px 14px;background:var(--soft)}
  .card h3{font-size:7.6pt;text-transform:uppercase;letter-spacing:.1em;color:var(--brand);margin-bottom:5px;font-weight:700}
  .card .who{font-size:11pt;font-weight:700;margin-bottom:2px}
  .card div{color:var(--ink)} .card .dim{color:var(--muted)}
  table.items{width:100%;border-collapse:collapse;margin-bottom:14px}
  table.items thead{display:table-header-group}
  table.items th{background:var(--brand-dark);color:#fff;font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:.06em;padding:8px 8px;text-align:left}
  table.items th.num{text-align:right}
  table.items td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  table.items tr{break-inside:avoid;page-break-inside:avoid}
  table.items tbody tr:nth-child(even) td{background:#fafcfd}
  .item-name{font-weight:600} .item-desc{color:var(--muted);font-size:8.4pt;margin-top:1px;white-space:pre-line}
  .summary{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:20px;break-inside:avoid}
  .words{flex:1;font-size:8.8pt;color:var(--muted);padding-top:4px}
  .words b{display:block;color:var(--ink);font-weight:600;margin-top:2px}
  table.totals{width:300px;border-collapse:collapse}
  table.totals td{padding:5px 8px;font-size:9.4pt} table.totals td:last-child{text-align:right;white-space:nowrap}
  table.totals tr.sub td{color:var(--muted);font-size:8.6pt;padding-top:1px;padding-bottom:1px}
  table.totals tr.rule td{border-top:1px solid var(--line)}
  table.totals tr.grand td{background:var(--brand);color:#fff;font-weight:700;font-size:11.2pt;padding:9px 10px}
  section{margin-bottom:16px;break-inside:avoid}
  section h2{font-size:9pt;text-transform:uppercase;letter-spacing:.1em;color:var(--brand-dark);font-weight:700;padding-bottom:5px;margin-bottom:8px;border-bottom:1.5px solid var(--aqua)}
  .prose{white-space:pre-line}
  ol.clauses{padding-left:18px} ol.clauses li{margin-bottom:3px;padding-left:2px}
  table.pay{border-collapse:collapse;width:100%}
  table.pay th{font-size:7.8pt;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);font-weight:600}
  table.pay th.num{text-align:right} table.pay td{padding:6px 8px;border-bottom:1px solid var(--line)}
  .two{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;margin-top:6px;break-inside:avoid}
  .bank dl{display:grid;grid-template-columns:auto 1fr;gap:3px 14px;font-size:9pt}
  .bank dt{color:var(--muted)} .bank dd{font-weight:600}
  .sign{text-align:center;display:flex;flex-direction:column;justify-content:space-between;min-height:128px}
  .sign .for{font-size:8.8pt;color:var(--muted)}
  .sign img{max-height:56px;max-width:170px;object-fit:contain;margin:6px auto}
  .sign .line{border-top:1px solid var(--ink);padding-top:5px;font-size:8.8pt}
  .sign .line b{display:block;font-size:9.6pt}
  .foot{margin-top:18px;padding-top:9px;border-top:1px solid var(--line);color:var(--muted);font-size:8pt;text-align:center}
`;

export function renderQuoteHtml(data: QuoteDocumentData, mode: DocumentMode): string {
  const { quote, settings, logoDataUri, signatureDataUri } = data;
  const { customer } = quote;

  const totals = calculateQuote(quotePricingInput(quote));
  const paymentTerms = (quote.paymentTerms as Milestone[] | null) ?? [];
  const termClauses = clauses(quote.terms);
  const discountLabel =
    quote.discountType === 'PERCENT' ? `Discount (${percent(num(quote.discountValue))})` : 'Discount';
  const hasBank = !!(settings.bankName || settings.accountNumber || settings.upiId);
  const cityLine = [settings.city, settings.state, settings.pincode].filter(Boolean).join(', ');

  const itemRows = quote.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="item-name">${escapeHtml(item.name)}</div>${
          item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''
        }</td>
        <td>${escapeHtml(item.unit)}</td>
        <td class="num">${qty(num(item.quantity))}</td>
        <td class="num">${money(num(item.rate))}</td>
        <td class="num">${percent(num(item.gstPercent))}</td>
        <td class="num">${money(totals.lineAmounts[i] ?? 0)}</td>
      </tr>`,
    )
    .join('');

  const totalRows = [
    `<tr><td>Subtotal</td><td>${money(totals.subtotal)}</td></tr>`,
    totals.discountAmount > 0 ? `<tr><td>${discountLabel}</td><td>− ${money(totals.discountAmount)}</td></tr>` : '',
    totals.otherCharges > 0 ? `<tr><td>Transportation / other charges</td><td>${money(totals.otherCharges)}</td></tr>` : '',
    `<tr class="rule"><td>Taxable amount</td><td>${money(totals.taxableAmount)}</td></tr>`,
    ...totals.gstBreakup
      .filter((row) => row.gstAmount > 0 || row.rate > 0)
      .map((row) => `<tr class="sub"><td>GST @ ${percent(row.rate)} on ${money(row.taxableAmount)}</td><td>${money(row.gstAmount)}</td></tr>`),
    `<tr><td>Total GST</td><td>${money(totals.gstAmount)}</td></tr>`,
    `<tr class="grand"><td>Grand Total</td><td>${money(totals.grandTotal)}</td></tr>`,
  ].join('');

  const paymentRows = paymentTerms
    .map(
      (m) => `<tr><td>${escapeHtml(m.label)}</td><td class="num">${percent(m.percent)}</td><td class="num">${money(
        Math.round(totals.grandTotal * m.percent) / 100,
      )}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(displayQuoteNumber(quote.quoteNumber, quote.version))} — ${escapeHtml(customer.name)}</title>
<style>${embeddedFontCss()}${CSS}</style>
</head>
<body class="${mode}">
<div class="sheet">
  <header class="top">
    <div class="brand">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="">` : ''}
      <div>
        <div class="name">${escapeHtml(settings.companyName)}</div>
        ${settings.tagline ? `<div class="tag">${escapeHtml(settings.tagline)}</div>` : ''}
      </div>
    </div>
    <div class="contact">
      ${addressLines(settings.address, cityLine)}
      <div>${escapeHtml(formatMobile(settings.mobile))} · ${escapeHtml(settings.email)}</div>
      ${settings.website ? `<div>${escapeHtml(settings.website)}</div>` : ''}
      ${settings.gstin ? `<div><strong>GSTIN:</strong> ${escapeHtml(settings.gstin)}</div>` : ''}
    </div>
  </header>

  <div class="title-row">
    <div class="title">QUOTATION</div>
    <dl class="meta">
      <dt>Quotation No.</dt><dd>${escapeHtml(displayQuoteNumber(quote.quoteNumber, quote.version))}</dd>
      <dt>Date</dt><dd>${formatLongDate(quote.issueDate)}</dd>
      <dt>Valid until</dt><dd>${formatLongDate(quote.validUntil)}</dd>
    </dl>
  </div>

  <div class="parties">
    <div class="card">
      <h3>Quotation for</h3>
      <div class="who">${escapeHtml(customer.name)}</div>
      ${addressLines(customer.address, customer.city)}
      <div class="dim">${escapeHtml(formatMobile(customer.mobile))}${customer.email ? ` · ${escapeHtml(customer.email)}` : ''}</div>
      ${customer.gstin ? `<div class="dim">GSTIN: ${escapeHtml(customer.gstin)}</div>` : ''}
    </div>
    <div class="card">
      <h3>Project / site</h3>
      ${
        quote.siteAddress || customer.city
          ? addressLines(quote.siteAddress, quote.siteAddress ? null : customer.city)
          : '<div class="dim">Same as billing address</div>'
      }
    </div>
  </div>

  <table class="items">
    <thead><tr>
      <th style="width:4%">#</th><th>Description</th><th style="width:8%">Unit</th>
      <th class="num" style="width:8%">Qty</th><th class="num" style="width:15%">Rate</th>
      <th class="num" style="width:8%">GST</th><th class="num" style="width:16%">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="summary">
    <div class="words">Amount in words<b>${escapeHtml(amountInWords(totals.grandTotal))}</b></div>
    <table class="totals">${totalRows}</table>
  </div>

  ${quote.scope?.trim() ? `<section><h2>Scope of work</h2><div class="prose">${escapeHtml(quote.scope.trim())}</div></section>` : ''}

  ${
    paymentTerms.length
      ? `<section><h2>Payment terms</h2><table class="pay">
          <thead><tr><th>Milestone</th><th class="num" style="width:14%">Share</th><th class="num" style="width:22%">Amount</th></tr></thead>
          <tbody>${paymentRows}</tbody></table></section>`
      : ''
  }

  ${
    termClauses.length
      ? `<section><h2>Terms &amp; conditions</h2><ol class="clauses">${termClauses.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ol></section>`
      : ''
  }

  ${quote.warranty?.trim() ? `<section><h2>Warranty</h2><div class="prose">${escapeHtml(quote.warranty.trim())}</div></section>` : ''}

  <div class="two">
    <div class="card bank">
      ${
        hasBank
          ? `<h3>Bank details</h3><dl>
              ${settings.accountName ? `<dt>Account name</dt><dd>${escapeHtml(settings.accountName)}</dd>` : ''}
              ${settings.bankName ? `<dt>Bank</dt><dd>${escapeHtml(settings.bankName)}${settings.bankBranch ? `, ${escapeHtml(settings.bankBranch)}` : ''}</dd>` : ''}
              ${settings.accountNumber ? `<dt>Account no.</dt><dd>${escapeHtml(settings.accountNumber)}</dd>` : ''}
              ${settings.ifsc ? `<dt>IFSC</dt><dd>${escapeHtml(settings.ifsc)}</dd>` : ''}
              ${settings.upiId ? `<dt>UPI</dt><dd>${escapeHtml(settings.upiId)}</dd>` : ''}
            </dl>`
          : '<h3>Bank details</h3><div class="dim">Add bank details in Settings.</div>'
      }
    </div>
    <div class="sign">
      <div class="for">For <b>${escapeHtml(settings.companyName)}</b></div>
      ${signatureDataUri ? `<img src="${signatureDataUri}" alt="">` : '<div style="height:56px"></div>'}
      <div class="line">${settings.signatoryName ? `<b>${escapeHtml(settings.signatoryName)}</b>` : ''}${escapeHtml(settings.signatoryTitle || 'Authorized Signatory')}</div>
    </div>
  </div>

  <div class="foot">This is a computer-generated quotation. Prices are subject to the terms stated above.</div>
</div>
</body>
</html>`;
}

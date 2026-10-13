/**
 * Money helpers. All arithmetic in the app is done in integer paise to avoid
 * floating point drift; rupees (number, 2dp) are used only at the edges.
 */

export const toPaise = (rupees: number): number => Math.round((rupees + Number.EPSILON) * 100);
export const fromPaise = (paise: number): number => paise / 100;

const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format as Indian rupees with lakh/crore grouping, e.g. ₹2,60,780.
 * `decimals: 'auto'` shows paise only when the value has them.
 */
export function formatINR(amount: number, decimals: 'auto' | 0 | 2 = 'auto'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const showDecimals = decimals === 2 || (decimals === 'auto' && toPaise(abs) % 100 !== 0);
  return `${sign}₹${(showDecimals ? inr2 : inr0).format(abs)}`;
}

/** Compact form used in dense lists, e.g. ₹2.61L, ₹1.20Cr. */
export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  return formatINR(amount, 0);
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n] ?? '';
  const tens = TENS[Math.floor(n / 10)] ?? '';
  const ones = ONES[n % 10] ?? '';
  return ones ? `${tens} ${ones}` : tens;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(belowHundred(rest));
  return parts.join(' ');
}

/** "Two Lakh Sixty Thousand Seven Hundred Eighty Rupees Only" (Indian numbering). */
export function amountInWords(amount: number): string {
  const totalPaise = Math.max(0, toPaise(amount));
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1e3);
  const rest = rupees % 1e3;

  const parts: string[] = [];
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));

  let words = parts.length ? `${parts.join(' ')} Rupees` : '';
  if (paise) words += `${words ? ' and ' : ''}${belowHundred(paise)} Paise`;
  return `${words} Only`;
}

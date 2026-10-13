/** Date-only helpers. Quote dates are calendar dates (no time zone), exchanged as YYYY-MM-DD. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function fromDateString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Today's date in India (the business operates in IST regardless of server time zone). */
export function todayIST(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return fromDateString(parts);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** 08-Oct-2026 */
export function formatLongDate(date: Date): string {
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${pad(date.getUTCDate())}-${month}-${date.getUTCFullYear()}`;
}

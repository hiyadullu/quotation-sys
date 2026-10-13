import type { QuoteStatus } from '@pool-quote/shared';
import { QUOTE_STATUS_LABELS } from '@pool-quote/shared';
import { cn } from '@/lib/cn';

const STATUS_STYLES: Record<QuoteStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SENT: 'bg-sky-50 text-sky-800 ring-sky-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 ring-rose-200',
};

const DOT_STYLES: Record<QuoteStatus, string> = {
  DRAFT: 'bg-slate-400',
  SENT: 'bg-sky-500',
  ACCEPTED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
};

export function StatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_STYLES[status], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_STYLES[status])} aria-hidden />
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'warn'; className?: string }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-50 text-brand-700',
    warn: 'bg-amber-50 text-amber-800',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>;
}

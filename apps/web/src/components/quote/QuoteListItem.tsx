import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { QuoteSummaryDTO } from '@pool-quote/shared';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '../ui/Badge';
import { Money } from '../ui/Money';

/** Link target depends on state: drafts reopen the editor, everything else opens the detail view. */
export const quoteHref = (q: Pick<QuoteSummaryDTO, 'id' | 'status'>) => (q.status === 'DRAFT' ? `/quotes/${q.id}/edit` : `/quotes/${q.id}`);

export function QuoteListItem({ quote }: { quote: QuoteSummaryDTO }) {
  return (
    <Link to={quoteHref(quote)} className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-alt">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-semibold tabular text-brand-900">{quote.displayNumber}</span>
          <StatusBadge status={quote.status} />
        </div>
        <div className="mt-0.5 truncate text-sm text-ink-soft">{quote.customer.name}</div>
      </div>
      <div className="text-right">
        <Money value={quote.total} className="text-[15px] font-bold text-ink" />
        <div className="text-xs text-ink-muted">{formatDate(quote.issueDate)}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
    </Link>
  );
}

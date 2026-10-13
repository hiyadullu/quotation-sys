import { Copy, FilePlus2, FileText, GitBranch, Pencil, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, type QuoteStatus } from '@pool-quote/shared';
import { quoteHref, QuoteListItem } from '@/components/quote/QuoteListItem';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useDebounced, useQuotes } from '@/lib/queries';
import { useQuoteActions } from '@/lib/quoteActions';

const PAGE_SIZE = 15;

export default function QuotesPage() {
  const [params, setParams] = useSearchParams();
  const status = QUOTE_STATUSES.find((s) => s === params.get('status')) as QuoteStatus | undefined;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search, 300);
  const { duplicate, revise } = useQuoteActions();

  useEffect(() => setPage(1), [debounced, status]);

  const { data, isLoading, isFetching, error, refetch } = useQuotes({ search: debounced, status, page, pageSize: PAGE_SIZE });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const setStatus = (next?: QuoteStatus) => {
    const copy = new URLSearchParams(params);
    if (next) copy.set('status', next);
    else copy.delete('status');
    setParams(copy, { replace: true });
  };

  return (
    <>
      <PageHeader title="Quotations" subtitle="Every quotation is saved automatically." actions={<LinkButton to="/quotes/new" icon={<FilePlus2 className="h-4 w-4" />}>New quote</LinkButton>} />

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quote number, customer, mobile or date (DD-MM-YYYY)"
          aria-label="Search quotations"
          className="input pl-10"
        />
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter by status">
        {[undefined, ...QUOTE_STATUSES].map((s) => (
          <button
            key={s ?? 'all'}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset transition',
              status === s ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-soft ring-surface-line hover:bg-surface-alt',
            )}
          >
            {s ? QUOTE_STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      <div className={cn('card overflow-hidden transition-opacity', isFetching && !isLoading && 'opacity-70')}>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-surface-line">
            {data.data.map((q) => (
              <li key={q.id}>
                <QuoteListItem quote={q} />
                <div className="flex flex-wrap gap-1.5 px-4 pb-3 -mt-1">
                  {q.status === 'DRAFT' ? (
                    <Link to={quoteHref(q)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-50"><Pencil className="h-3.5 w-3.5" />Continue editing</Link>
                  ) : (
                    <Button variant="ghost" size="sm" className="!h-8 !px-2.5 text-[13px]" icon={<GitBranch className="h-3.5 w-3.5" />} loading={revise.isPending && revise.variables === q.id} onClick={() => revise.mutate(q.id)}>Revise</Button>
                  )}
                  <Button variant="ghost" size="sm" className="!h-8 !px-2.5 text-[13px]" icon={<Copy className="h-3.5 w-3.5" />} loading={duplicate.isPending && duplicate.variables === q.id} onClick={() => duplicate.mutate(q.id)}>Duplicate</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<FileText className="h-7 w-7" />} title={debounced || status ? 'No quotations found' : 'No quotations yet'} action={!debounced && !status && <LinkButton to="/quotes/new" icon={<FilePlus2 className="h-4 w-4" />}>Create a quote</LinkButton>}>
            {debounced || status ? 'Try a different search or filter.' : 'Create your first quotation to get started.'}
          </EmptyState>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
          <span>{data.total} quotations</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="tabular">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}

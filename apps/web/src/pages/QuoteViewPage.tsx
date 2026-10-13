import { CheckCircle2, Copy, Download, FileCheck2, GitBranch, Mail, MessageCircle, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { formatINR, formatMobile, type ActivityType } from '@pool-quote/shared';
import { QuotePreviewFrame } from '@/components/quote/QuotePreviewFrame';
import { ShareDialog } from '@/components/quote/ShareDialog';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { useQuote } from '@/lib/queries';
import { useQuoteActions } from '@/lib/quoteActions';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  CREATED: 'Quotation created',
  UPDATED: 'Quotation updated',
  PDF_GENERATED: 'PDF generated',
  SENT_EMAIL: 'Sent by email',
  SENT_WHATSAPP: 'Shared on WhatsApp',
  STATUS_CHANGED: 'Status changed',
  REVISED: 'Revision created',
  DUPLICATED: 'Created as a copy',
};

export default function QuoteViewPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: quote, isLoading, error, refetch } = useQuote(id);
  const { duplicate, revise, setStatus } = useQuoteActions();
  const [channel, setChannel] = useState<'whatsapp' | 'email' | null>(null);

  if (isLoading) return <PageLoader />;
  if (error || !quote) return <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (quote.status === 'DRAFT' && !params.get('share')) return <Navigate to={`/quotes/${quote.id}/edit`} replace />;

  const justGenerated = params.get('share') === '1';
  const change = (status: 'SENT' | 'ACCEPTED' | 'REJECTED') => setStatus.mutate({ id: quote.id, status });
  const otherVersions = quote.versions.filter((v) => v.id !== quote.id);

  return (
    <div className="mx-auto max-w-4xl">
      {!quote.isLatest && (
        <Alert tone="info" className="mb-4">
          This is an earlier version. <Link className="font-semibold underline" to={`/quotes/${quote.versions[0]?.id ?? quote.id}`}>Open the latest version</Link>
        </Alert>
      )}

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/quotes" className="text-sm font-medium text-brand-600 hover:underline">← All quotations</Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tabular">{quote.displayNumber}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="mt-1 text-[15px] text-ink-soft">{quote.customer.name} · {formatMobile(quote.customer.mobile)}</p>
        </div>
        <div className="sm:text-right">
          <Money value={quote.totals.grandTotal} decimals={2} className="text-2xl font-extrabold text-brand-900" />
          <p className="text-sm text-ink-muted">Valid until {formatDate(quote.validUntil)}</p>
        </div>
      </header>

      <section className={cn('card mb-5 p-5', justGenerated && 'ring-2 ring-emerald-400/60')} aria-label="Share quotation">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><FileCheck2 className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-bold">{justGenerated ? 'Quotation ready to send' : 'Share quotation'}</h2>
            <p className="text-sm text-ink-muted">{formatINR(quote.totals.grandTotal, 2)} · {quote.items.length} item{quote.items.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Button variant="success" size="lg" icon={<MessageCircle className="h-5 w-5" />} onClick={() => setChannel('whatsapp')}>WhatsApp</Button>
          <Button size="lg" icon={<Mail className="h-5 w-5" />} onClick={() => setChannel('email')}>Email</Button>
          <a href={`/api/quotes/${quote.id}/pdf?download=1`} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-surface-line bg-white px-6 text-base font-semibold text-brand-900 shadow-sm transition hover:bg-surface-alt">
            <Download className="h-5 w-5" /> Download PDF
          </a>
        </div>
      </section>

      <section className="mb-5 flex flex-wrap gap-2" aria-label="Quotation actions">
        {quote.status === 'SENT' && (
          <>
            <Button variant="secondary" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} loading={setStatus.isPending} onClick={() => change('ACCEPTED')}>Mark accepted</Button>
            <Button variant="secondary" icon={<XCircle className="h-4 w-4 text-rose-600" />} loading={setStatus.isPending} onClick={() => change('REJECTED')}>Mark rejected</Button>
          </>
        )}
        {(quote.status === 'ACCEPTED' || quote.status === 'REJECTED') && (
          <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} loading={setStatus.isPending} onClick={() => change('SENT')}>Reopen as sent</Button>
        )}
        {quote.isLatest && quote.status !== 'DRAFT' && (
          <Button variant="secondary" icon={<GitBranch className="h-4 w-4" />} loading={revise.isPending} onClick={() => revise.mutate(quote.id)}>Revise (new version)</Button>
        )}
        <Button variant="secondary" icon={<Copy className="h-4 w-4" />} loading={duplicate.isPending} onClick={() => duplicate.mutate(quote.id)}>Duplicate</Button>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
        <section aria-label="Quotation preview" className="min-w-0">
          <QuotePreviewFrame quoteId={quote.id} version={quote.updatedAt} />
        </section>

        <aside className="space-y-5">
          {quote.versions.length > 1 && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Versions</h2>
              <ul className="space-y-1.5">
                {quote.versions.map((v) => (
                  <li key={v.id}>
                    <Link to={v.status === 'DRAFT' ? `/quotes/${v.id}/edit` : `/quotes/${v.id}`} className={cn('flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-surface-alt', v.id === quote.id && 'bg-brand-50 font-semibold')}>
                      <span>Version {v.version}</span>
                      <StatusBadge status={v.status} />
                    </Link>
                  </li>
                ))}
              </ul>
              {otherVersions.length === 0 && null}
            </section>
          )}

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Activity</h2>
            <ol className="relative space-y-4 border-l border-surface-line pl-4">
              {quote.activities.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" aria-hidden />
                  <p className="text-sm font-semibold text-ink">{ACTIVITY_LABELS[a.type]}</p>
                  {a.note && <p className="text-sm text-ink-soft">{a.note}</p>}
                  <p className="text-xs text-ink-muted">{formatDateTime(a.createdAt)}{a.user ? ` · ${a.user.name}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <ShareDialog quote={quote} channel={channel} onClose={() => { setChannel(null); if (justGenerated) setParams({}, { replace: true }); }} />
    </div>
  );
}

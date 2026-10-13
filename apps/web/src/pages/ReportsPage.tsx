import { BadgeIndianRupee, CheckCircle2, FileText, Percent, Send, XCircle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { formatINR, formatINRCompact } from '@pool-quote/shared';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { addDaysISO, todayISO } from '@/lib/format';
import { useReport } from '@/lib/queries';

type Preset = 'month' | 'quarter' | 'fy' | 'all';

function rangeFor(preset: Preset): { from: string; to: string } {
  const today = todayISO();
  const [y, m] = today.split('-').map(Number) as [number, number];
  if (preset === 'month') return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: today };
  if (preset === 'quarter') return { from: addDaysISO(today, -90), to: today };
  if (preset === 'fy') return { from: `${m >= 4 ? y : y - 1}-04-01`, to: today };
  return { from: '', to: '' };
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'Last 90 days' },
  { id: 'fy', label: 'This financial year' },
  { id: 'all', label: 'All time' },
];

function Metric({ label, value, icon: Icon, tone, sub }: { label: string; value?: string; icon: LucideIcon; tone: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" /></span>
        <span className="text-sm font-medium text-ink-muted">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-extrabold tabular text-brand-900">{value ?? <Skeleton className="h-8 w-24" />}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('fy');
  const { from, to } = rangeFor(preset);
  const { data, error, refetch } = useReport(from, to);
  const maxValue = Math.max(1, ...(data?.byMonth.map((m) => m.value) ?? [1]));

  return (
    <>
      <PageHeader title="Reports" subtitle="How your quotations are performing." />
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPreset(p.id)}
            className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset transition', preset === p.id ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-soft ring-surface-line hover:bg-surface-alt')}>
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Metric label="Quotations created" value={data?.totalQuotes.toString()} icon={FileText} tone="bg-brand-50 text-brand-600" sub={data ? `${data.draft} still in draft` : undefined} />
            <Metric label="Total quotation value" value={data && formatINRCompact(data.totalValue)} icon={BadgeIndianRupee} tone="bg-violet-50 text-violet-600" sub={data && formatINR(data.totalValue)} />
            <Metric label="Quotes sent" value={data?.sent.toString()} icon={Send} tone="bg-sky-50 text-sky-600" />
            <Metric label="Accepted" value={data?.accepted.toString()} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" sub={data && `Worth ${formatINRCompact(data.acceptedValue)}`} />
            <Metric label="Rejected" value={data?.rejected.toString()} icon={XCircle} tone="bg-rose-50 text-rose-600" />
            <Metric label="Conversion rate" value={data && `${data.conversionRate}%`} icon={Percent} tone="bg-amber-50 text-amber-600" sub="Accepted ÷ sent" />
          </div>

          <section className="card mt-6 p-5" aria-labelledby="monthly-heading">
            <h2 id="monthly-heading" className="mb-4 text-base font-bold">Quotation value by month</h2>
            {!data ? <Skeleton className="h-40" /> : data.byMonth.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">No quotations in this period.</p>
            ) : (
              <ul className="space-y-3">
                {data.byMonth.map((m) => (
                  <li key={m.month} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="tabular text-ink-muted">{new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-surface-alt" role="img" aria-label={`${formatINR(m.value)} across ${m.count} quotations`}>
                      <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-500" style={{ width: `${Math.max(3, (m.value / maxValue) * 100)}%` }} />
                    </span>
                    <span className="tabular text-right font-semibold">{formatINRCompact(m.value)} <span className="font-normal text-ink-muted">· {m.count}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

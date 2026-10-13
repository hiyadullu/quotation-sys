import { CheckCircle2, Clock3, FilePlus2, FileText, Package, Send, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { QuoteListItem } from '@/components/quote/QuoteListItem';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { useDashboard } from '@/lib/queries';

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function Stat({ label, value, icon: Icon, tone, to }: { label: string; value?: number; icon: LucideIcon; tone: string; to: string }) {
  return (
    <Link to={to} className="card group flex items-center gap-3.5 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" /></span>
      <span>
        <span className="block text-2xl font-extrabold leading-none tabular text-brand-900">{value ?? <Skeleton className="inline-block h-6 w-8" />}</span>
        <span className="mt-1 block text-sm text-ink-muted">{label}</span>
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();

  return (
    <>
      <section className="relative isolate mb-6 overflow-hidden rounded-xl2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white shadow-card sm:p-8">
        <svg className="absolute inset-0 -z-10 h-full w-full opacity-30" viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden>
          <path d="M0 120 C 100 80, 200 160, 320 118 S 520 70, 600 110 V200 H0Z" fill="#14a9c0" fillOpacity=".5" />
          <path d="M0 150 C 120 110, 240 190, 360 148 S 540 110, 600 140 V200 H0Z" fill="#7bd8e6" fillOpacity=".35" />
        </svg>
        <p className="text-sm font-medium text-brand-100">{greeting()}, {user?.name.split(' ')[0]}</p>
        <h1 className="mt-1 text-2xl font-extrabold !text-white sm:text-3xl">Ready to price the next pool?</h1>
        <LinkButton to="/quotes/new" size="lg" icon={<FilePlus2 className="h-5 w-5" />} className="mt-5 !from-white !to-brand-50 !text-brand-900 shadow-lift hover:!from-brand-50">
          Create new quote
        </LinkButton>
      </section>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Quotes created" value={data?.created} icon={FileText} tone="bg-brand-50 text-brand-600" to="/quotes" />
            <Stat label="Sent to customers" value={data?.sent} icon={Send} tone="bg-sky-50 text-sky-600" to="/quotes?status=SENT" />
            <Stat label="Accepted" value={data?.accepted} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" to="/quotes?status=ACCEPTED" />
            <Stat label="Awaiting reply" value={data?.pending} icon={Clock3} tone="bg-amber-50 text-amber-600" to="/quotes?status=SENT" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_16rem]">
            <section className="card overflow-hidden" aria-labelledby="recent-heading">
              <div className="flex items-center justify-between border-b border-surface-line px-4 py-3.5">
                <h2 id="recent-heading" className="text-base font-bold">Recent quotations</h2>
                <Link to="/quotes" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
              </div>
              {isLoading ? (
                <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : data && data.recent.length > 0 ? (
                <ul className="divide-y divide-surface-line">{data.recent.map((q) => <li key={q.id}><QuoteListItem quote={q} /></li>)}</ul>
              ) : (
                <EmptyState icon={<FileText className="h-7 w-7" />} title="No quotations yet" action={<LinkButton to="/quotes/new" icon={<FilePlus2 className="h-4 w-4" />}>Create your first quote</LinkButton>}>
                  Your quotations will appear here as soon as you create them.
                </EmptyState>
              )}
            </section>

            <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link to="/customers" className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
                <Users className="h-5 w-5 text-brand-600" />
                <span className="flex-1 text-[15px] font-semibold">Customers</span>
                <span className="tabular text-sm text-ink-muted">{data?.customerCount ?? '–'}</span>
              </Link>
              <Link to="/products" className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
                <Package className="h-5 w-5 text-brand-600" />
                <span className="flex-1 text-[15px] font-semibold">Products & services</span>
                <span className="tabular text-sm text-ink-muted">{data?.productCount ?? '–'}</span>
              </Link>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

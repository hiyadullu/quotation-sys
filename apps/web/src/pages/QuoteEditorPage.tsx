import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileDown, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { formatINR, quoteUpdateSchema, type QuoteDTO, type QuoteUpdateInput } from '@pool-quote/shared';
import { DetailsStep } from '@/components/quote/DetailsStep';
import { ItemsStep } from '@/components/quote/ItemsStep';
import { QuotePreviewFrame } from '@/components/quote/QuotePreviewFrame';
import { StepIndicator, type StepId } from '@/components/quote/StepIndicator';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { keys, useQuote } from '@/lib/queries';
import { invalidateQuoteData, useQuoteActions } from '@/lib/quoteActions';
import { quoteToForm } from '@/lib/quoteForm';

const EDITOR_STEPS = ['items', 'details', 'preview'] as const;
type EditorStep = (typeof EDITOR_STEPS)[number];

export default function QuoteEditorPage() {
  const { id } = useParams();
  const { data: quote, isLoading, error, refetch } = useQuote(id);

  if (isLoading) return <PageLoader />;
  if (error || !quote) return <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (quote.status !== 'DRAFT') return <Navigate to={`/quotes/${quote.id}`} replace />;
  return <Editor key={quote.id} quote={quote} />;
}

function Editor({ quote }: { quote: QuoteDTO }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { remove } = useQuoteActions();
  const [customer, setCustomer] = useState(quote.customer);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const requested = params.get('step');
  const step: EditorStep = EDITOR_STEPS.find((s) => s === requested) ?? 'items';

  const form = useForm<QuoteUpdateInput>({ resolver: zodResolver(quoteUpdateSchema), defaultValues: quoteToForm(quote) });
  const { isDirty } = form.formState;

  const save = useMutation({
    mutationFn: (values: QuoteUpdateInput) => api.put<QuoteDTO>(`/quotes/${quote.id}`, values),
    onSuccess: async (saved) => {
      qc.setQueryData(keys.quote(saved.id), saved);
      form.reset(quoteToForm(saved));
      await invalidateQuoteData(qc);
    },
  });

  const generate = useMutation({
    mutationFn: () => api.post<{ fileName: string }>(`/quotes/${quote.id}/generate-pdf`),
    onSuccess: async () => {
      await invalidateQuoteData(qc);
      navigate(`/quotes/${quote.id}?share=1`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  /** Saves pending edits. Returns false (and tells the user) if the form is invalid or the save fails. */
  const persist = async (): Promise<boolean> => {
    if (!isDirty) return true;
    if (!(await form.trigger())) {
      toast.error('Please fix the highlighted fields first.');
      return false;
    }
    try {
      await save.mutateAsync(form.getValues());
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const goTo = async (next: EditorStep) => {
    if (next === step) return;
    if (await persist()) {
      setParams({ step: next }, { replace: false });
      window.scrollTo({ top: 0 });
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const index = EDITOR_STEPS.indexOf(step);
  const prev = EDITOR_STEPS[index - 1];
  const next = EDITOR_STEPS[index + 1];
  const busy = save.isPending || generate.isPending;
  const hasProblems = quote.issueProblems.length > 0;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/quotes" className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" />All quotations</Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-extrabold tabular sm:text-2xl">{quote.displayNumber}</h1>
            <StatusBadge status="DRAFT" />
          </div>
          <p className="truncate text-sm text-ink-muted">for {customer.name}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} aria-label="Delete draft" onClick={() => setConfirmDelete(true)}><span className="hidden sm:inline">Delete draft</span></Button>
      </div>

      <StepIndicator current={step} onSelect={(s) => s !== 'customer' && void goTo(s)} />

      <form onSubmit={(e) => e.preventDefault()} noValidate>
        {step === 'items' && <ItemsStep form={form} />}
        {step === 'details' && <DetailsStep form={form} customer={customer} onCustomerChange={(c) => setCustomer({ id: c.id, name: c.name, mobile: c.mobile, email: c.email })} />}
        {step === 'preview' && (
          <div className="mx-auto max-w-[52rem] space-y-4">
            {hasProblems && <Alert>{quote.issueProblems.map((p) => <div key={p}>{p}</div>)}<div className="mt-1 text-xs opacity-80">Go back to fix this before generating the PDF.</div></Alert>}
            <div className="card flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 text-sm">
              <span><span className="text-ink-muted">Date </span><b>{formatDate(quote.issueDate)}</b></span>
              <span><span className="text-ink-muted">Valid until </span><b>{formatDate(quote.validUntil)}</b></span>
              <span><span className="text-ink-muted">Grand total </span><b className="tabular text-brand-900">{formatINR(quote.totals.grandTotal, 2)}</b></span>
            </div>
            <QuotePreviewFrame quoteId={quote.id} version={quote.updatedAt} />
          </div>
        )}
      </form>

      <div className="safe-bottom sticky bottom-[4.75rem] z-20 mt-6 lg:bottom-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl2 border border-surface-line bg-white/95 p-2.5 shadow-lift backdrop-blur">
          {prev ? <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => void goTo(prev)} disabled={busy}><span className="hidden sm:inline">Back</span></Button> : <span />}
          <span className="flex-1" />
          <Button variant="secondary" className="px-3 sm:px-4" icon={<Save className="h-4 w-4" />} loading={save.isPending && !generate.isPending} disabled={generate.isPending}
            onClick={async () => { if (await persist()) toast.success('Draft saved'); }}>
            Save draft
          </Button>
          {next ? (
            <Button className="px-3 sm:px-4" disabled={busy} onClick={() => void goTo(next)}>Continue <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button variant="success" className="px-3 sm:px-4" icon={<FileDown className="h-4 w-4" />} loading={generate.isPending} disabled={hasProblems || isDirty || save.isPending}
              onClick={async () => { if (await persist()) generate.mutate(); }}>
              Generate PDF
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete this draft?" confirmLabel="Delete draft" danger loading={remove.isPending} onClose={() => setConfirmDelete(false)} onConfirm={() => remove.mutate(quote.id)}>
        <strong>{quote.displayNumber}</strong> will be permanently removed. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}

export type { StepId };

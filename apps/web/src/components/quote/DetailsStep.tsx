import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { formatMobile, type CustomerDTO, type QuoteUpdateInput, type TemplateDTO } from '@pool-quote/shared';
import { cn } from '@/lib/cn';
import { useTemplates } from '@/lib/queries';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { CustomerPicker } from './CustomerPicker';

interface DetailsStepProps {
  form: UseFormReturn<QuoteUpdateInput>;
  customer: { id: string; name: string; mobile: string; email: string | null };
  onCustomerChange: (customer: CustomerDTO) => void;
}

function TemplateSelect({ templates, label, onApply }: { templates: TemplateDTO[]; label: string; onApply: (t: TemplateDTO) => void }) {
  if (templates.length === 0) return null;
  return (
    <Select
      label={label}
      value=""
      onChange={(e) => {
        const picked = templates.find((t) => t.id === e.target.value);
        if (picked) onApply(picked);
      }}
      wrapperClassName="sm:max-w-xs"
    >
      <option value="">Choose a template…</option>
      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (default)' : ''}</option>)}
    </Select>
  );
}

export function DetailsStep({ form, customer, onCustomerChange }: DetailsStepProps) {
  const { register, control, setValue, getValues, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'paymentTerms' });
  const milestones = useWatch({ control, name: 'paymentTerms' });
  const { data: templates = [] } = useTemplates();
  const [changing, setChanging] = useState(false);

  const total = (milestones ?? []).reduce((sum, m) => sum + (Number.isFinite(m.percent) ? m.percent : 0), 0);
  const balanced = Math.abs(total - 100) < 0.01;
  const byKind = (kind: TemplateDTO['kind']) => templates.filter((t) => t.kind === kind);
  const dirty = { shouldDirty: true } as const;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Customer</h2>
            <p className="mt-2 font-semibold text-ink">{customer.name}</p>
            <p className="text-sm text-ink-muted">{formatMobile(customer.mobile)}{customer.email ? ` · ${customer.email}` : ''}</p>
          </div>
          <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setChanging(true)}>Change</Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Quotation date" type="date" error={errors.issueDate?.message} {...register('issueDate')} />
          <Input label="Valid until" type="date" error={errors.validUntil?.message} {...register('validUntil')} />
          <Textarea label="Project / site address" rows={2} wrapperClassName="sm:col-span-2" error={errors.siteAddress?.message} {...register('siteAddress')} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">Scope of work</h2>
        <TemplateSelect templates={byKind('SCOPE')} label="Start from a template" onApply={(t) => setValue('scope', t.body ?? '', dirty)} />
        <Textarea aria-label="Scope of work" rows={5} wrapperClassName="mt-3" placeholder="Describe what is included in this quotation…" error={errors.scope?.message} {...register('scope')} />
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Payment terms</h2>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold tabular', balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')} role="status">
            {fields.length === 0 ? 'No milestones' : `Total ${Number(total.toFixed(2))}%`}
          </span>
        </div>
        <TemplateSelect templates={byKind('PAYMENT')} label="Start from a template" onApply={(t) => setValue('paymentTerms', t.milestones ?? [], dirty)} />
        <ul className="mt-3 space-y-2">
          {fields.map((field, index) => (
            <li key={field.id} className="grid grid-cols-[1fr_5.5rem_auto] items-start gap-2">
              <Input aria-label={`Milestone ${index + 1}`} placeholder="e.g. Advance with order" error={errors.paymentTerms?.[index]?.label?.message} {...register(`paymentTerms.${index}.label`)} />
              <div className="relative">
                <Input aria-label={`Milestone ${index + 1} percent`} type="number" inputMode="decimal" step="any" className="pr-7" error={errors.paymentTerms?.[index]?.percent?.message} {...register(`paymentTerms.${index}.percent`, { valueAsNumber: true })} />
                <span className="pointer-events-none absolute right-3 top-3 text-ink-muted">%</span>
              </div>
              <button type="button" onClick={() => remove(index)} aria-label={`Remove milestone ${index + 1}`} className="mt-1.5 rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-600"><Trash2 className="h-[18px] w-[18px]" /></button>
            </li>
          ))}
        </ul>
        {fields.length > 0 && !balanced && <p role="alert" className="mt-2 text-sm text-red-600">Milestones must add up to 100% before the PDF can be generated.</p>}
        <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => append({ label: '', percent: Math.max(0, Math.round((100 - total) * 100) / 100) })}>Add milestone</Button>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">Terms & conditions</h2>
        <TemplateSelect templates={byKind('TERMS')} label="Start from a template" onApply={(t) => setValue('terms', t.body ?? '', dirty)} />
        <Textarea aria-label="Terms and conditions" rows={7} wrapperClassName="mt-3" hint="One clause per line — they are numbered automatically on the PDF." error={errors.terms?.message} {...register('terms')} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">Warranty</h2>
        <Textarea aria-label="Warranty" rows={3} placeholder="e.g. As per manufacturer terms" error={errors.warranty?.message} {...register('warranty')} />
      </section>

      <Modal open={changing} onClose={() => setChanging(false)} title="Change customer" size="md">
        <CustomerPicker
          value={null}
          onChange={(c) => {
            onCustomerChange(c);
            setValue('customerId', c.id, dirty);
            if (!getValues('siteAddress') && c.siteAddress) setValue('siteAddress', c.siteAddress, dirty);
            setChanging(false);
          }}
        />
      </Modal>
    </div>
  );
}

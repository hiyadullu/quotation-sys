import { BookOpen, PenLine, PackagePlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { COMMON_UNITS, GST_SLABS, formatINR, type QuoteUpdateInput } from '@pool-quote/shared';
import { cn } from '@/lib/cn';
import { blankItem, itemFromProduct } from '@/lib/quoteForm';
import { useSettings } from '@/lib/queries';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { ProductPicker } from './ProductPicker';
import { TotalsCard, useTotals } from './TotalsCard';

export function ItemsStep({ form }: { form: UseFormReturn<QuoteUpdateInput> }) {
  const { register, control, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: settings } = useSettings();

  const items = useWatch({ control, name: 'items' });
  const discountType = useWatch({ control, name: 'discountType' });
  const discountValue = useWatch({ control, name: 'discountValue' });
  const otherCharges = useWatch({ control, name: 'otherCharges' });
  const otherChargesGstPercent = useWatch({ control, name: 'otherChargesGstPercent' });
  const totals = useTotals({ items, discountType, discountValue, otherCharges, otherChargesGstPercent });

  const num = { valueAsNumber: true } as const;
  const itemError = (index: number, field: keyof QuoteUpdateInput['items'][number]) => errors.items?.[index]?.[field]?.message;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
      <div className="space-y-5">
        <section aria-label="Quotation items" className="space-y-3">
          {fields.length === 0 && (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><PackagePlus className="h-7 w-7" /></span>
              <h3 className="text-lg font-bold">Add the first item</h3>
              <p className="mt-1 max-w-xs text-sm text-ink-muted">Choose equipment, plumbing, civil work or services from your catalogue — or type in a custom item.</p>
            </div>
          )}

          {fields.map((field, index) => (
            <article key={field.id} className="card p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{index + 1}</span>
                <div className="ml-auto text-right">
                  <span className="mr-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Amount</span>
                  <span className="tabular text-base font-extrabold text-brand-900">{formatINR(totals.lineAmounts[index] ?? 0, 2)}</span>
                </div>
                <button type="button" onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`} className="-mr-1.5 rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"><Trash2 className="h-[18px] w-[18px]" /></button>
              </div>
              <div className="grid gap-3">
                <Input aria-label={`Item ${index + 1} name`} placeholder="Item name" error={itemError(index, 'name')} {...register(`items.${index}.name`)} />
                <Input aria-label={`Item ${index + 1} description`} placeholder="Description (optional)" className="!py-2 text-sm" {...register(`items.${index}.description`)} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Input label="Qty" type="number" inputMode="decimal" step="any" min="0" error={itemError(index, 'quantity')} {...register(`items.${index}.quantity`, num)} />
                  <Input label="Unit" list="unit-options" error={itemError(index, 'unit')} {...register(`items.${index}.unit`)} />
                  <Input label="Rate (₹)" type="number" inputMode="decimal" step="any" min="0" error={itemError(index, 'rate')} {...register(`items.${index}.rate`, num)} />
                  <Select label="GST" {...register(`items.${index}.gstPercent`, num)}>
                    {[...new Set<number>([...GST_SLABS, items?.[index]?.gstPercent ?? 18])].sort((a, b) => a - b).map((g) => <option key={g} value={g}>{g}%</option>)}
                  </Select>
                </div>
              </div>
            </article>
          ))}
          {errors.items?.root?.message && <p role="alert" className="text-sm text-red-600">{errors.items.root.message}</p>}

          <div className="flex flex-wrap gap-2">
            <Button icon={<BookOpen className="h-4 w-4" />} onClick={() => setPickerOpen(true)}>Add from catalogue</Button>
            <Button variant="secondary" icon={<PenLine className="h-4 w-4" />} onClick={() => append(blankItem(settings?.defaultGstPercent))}>Custom item</Button>
          </div>
          <datalist id="unit-options">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </section>

        <section className="card p-5" aria-labelledby="charges-heading">
          <h2 id="charges-heading" className="mb-4 text-base font-bold">Discount & other charges</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Discount</span>
              <div className="flex gap-2">
                <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-surface-line" role="group" aria-label="Discount type">
                  {(['AMOUNT', 'PERCENT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={discountType === t}
                      onClick={() => setValue('discountType', t, { shouldDirty: true })}
                      className={cn('h-[46px] w-11 text-base font-bold transition', discountType === t ? 'bg-brand-900 text-white' : 'bg-white text-ink-soft hover:bg-surface-alt')}
                    >
                      {t === 'AMOUNT' ? '₹' : '%'}
                    </button>
                  ))}
                </div>
                <Input aria-label="Discount value" type="number" inputMode="decimal" step="any" min="0" wrapperClassName="flex-1" error={errors.discountValue?.message} {...register('discountValue', num)} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">Applied before GST, spread across all items.</p>
            </div>
            <div className="grid grid-cols-[1fr_6.5rem] gap-3">
              <Input label="Transportation / other charges (₹)" type="number" inputMode="decimal" step="any" min="0" error={errors.otherCharges?.message} {...register('otherCharges', num)} />
              <Select label="GST" {...register('otherChargesGstPercent', num)}>
                {GST_SLABS.map((g) => <option key={g} value={g}>{g}%</option>)}
              </Select>
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <TotalsCard items={items} discountType={discountType} discountValue={discountValue} otherCharges={otherCharges} otherChargesGstPercent={otherChargesGstPercent} />
      </aside>

      <ProductPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(p) => append(itemFromProduct(p))} />
    </div>
  );
}

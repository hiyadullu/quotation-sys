import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { TEMPLATE_KINDS, TEMPLATE_KIND_LABELS, templateSchema, type TemplateDTO, type TemplateInput, type TemplateKind } from '@pool-quote/shared';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Feedback';
import { Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys, useTemplates } from '@/lib/queries';

const HELP: Record<TemplateKind, string> = {
  SCOPE: 'Reusable descriptions of the work included. Pick one when creating a quotation.',
  PAYMENT: 'Milestone payment schedules. Percentages must add up to 100%.',
  TERMS: 'Standard clauses — one per line. They are numbered automatically on the PDF.',
};

export function TemplatesTab() {
  const { data: templates, isLoading } = useTemplates();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ kind: TemplateKind; template: TemplateDTO | null } | null>(null);
  const [deleting, setDeleting] = useState<TemplateDTO | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/templates/${id}`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: keys.templates }); toast.success('Template deleted'); setDeleting(null); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {TEMPLATE_KINDS.map((kind) => {
        const items = templates?.filter((t) => t.kind === kind) ?? [];
        return (
          <section key={kind} className="card overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-surface-line p-4">
              <div>
                <h2 className="text-base font-bold">{TEMPLATE_KIND_LABELS[kind]}</h2>
                <p className="mt-0.5 text-sm text-ink-muted">{HELP[kind]}</p>
              </div>
              <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ kind, template: null })}>Add</Button>
            </div>
            {isLoading ? <div className="p-4"><Skeleton className="h-12" /></div> : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-muted">No templates yet.</p>
            ) : (
              <ul className="divide-y divide-surface-line">
                {items.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{t.name}</span>
                        {t.isDefault && <Pill tone="brand"><Star className="mr-1 h-3 w-3" />Default</Pill>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
                        {t.kind === 'PAYMENT' ? t.milestones?.map((m) => `${m.percent}% ${m.label}`).join(' · ') : t.body}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" aria-label={`Edit ${t.name}`} onClick={() => setEditing({ kind, template: t })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Delete ${t.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(t)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {editing && <TemplateModal kind={editing.kind} template={editing.template} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete template?" confirmLabel="Delete" danger loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)}>
        <strong>{deleting?.name}</strong> will be deleted. Existing quotations keep their text.
      </ConfirmDialog>
    </div>
  );
}

function TemplateModal({ kind, template, onClose }: { kind: TemplateKind; template: TemplateDTO | null; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      kind,
      name: template?.name ?? '',
      body: template?.body ?? '',
      milestones: template?.milestones ?? (kind === 'PAYMENT' ? [{ label: 'Advance with order', percent: 50 }, { label: 'On completion', percent: 50 }] : undefined),
      isDefault: template?.isDefault ?? false,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });
  const milestones = useWatch({ control, name: 'milestones' });
  const total = (milestones ?? []).reduce((s, m) => s + (Number.isFinite(m.percent) ? m.percent : 0), 0);

  const save = useMutation({
    mutationFn: (input: TemplateInput) => (template ? api.put<TemplateDTO>(`/templates/${template.id}`, input) : api.post<TemplateDTO>('/templates', input)),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: keys.templates }); toast.success('Template saved'); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const milestoneRootError = (errors.milestones as { message?: string; root?: { message?: string } } | undefined);
  return (
    <Modal open onClose={onClose} title={`${template ? 'Edit' : 'New'} ${TEMPLATE_KIND_LABELS[kind].toLowerCase()} template`} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="template-form" loading={save.isPending}>Save template</Button></>}>
      <form id="template-form" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Input label="Template name" required error={errors.name?.message} {...register('name')} />
        {kind === 'PAYMENT' ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Milestones</span>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold tabular', Math.abs(total - 100) < 0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>Total {Number(total.toFixed(2))}%</span>
            </div>
            <ul className="space-y-2">
              {fields.map((f, i) => (
                <li key={f.id} className="grid grid-cols-[1fr_5.5rem_auto] items-start gap-2">
                  <Input aria-label={`Milestone ${i + 1}`} error={errors.milestones?.[i]?.label?.message} {...register(`milestones.${i}.label`)} />
                  <Input aria-label={`Milestone ${i + 1} percent`} type="number" step="any" error={errors.milestones?.[i]?.percent?.message} {...register(`milestones.${i}.percent`, { valueAsNumber: true })} />
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove milestone ${i + 1}`} className="mt-1.5 rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-600"><Trash2 className="h-[18px] w-[18px]" /></button>
                </li>
              ))}
            </ul>
            {(milestoneRootError?.message || milestoneRootError?.root?.message) && <p role="alert" className="mt-2 text-sm text-red-600">{milestoneRootError.message ?? milestoneRootError.root?.message}</p>}
            <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => append({ label: '', percent: 0 })}>Add milestone</Button>
          </div>
        ) : (
          <Textarea label={kind === 'TERMS' ? 'Clauses (one per line)' : 'Scope of work'} rows={kind === 'TERMS' ? 10 : 6} error={errors.body?.message} {...register('body')} />
        )}
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="h-4 w-4 rounded border-surface-line text-brand-600" {...register('isDefault')} /> Use as the default for new quotations
        </label>
      </form>
    </Modal>
  );
}

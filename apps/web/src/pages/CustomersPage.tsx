import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatMobile, type CustomerDTO, type CustomerInput } from '@pool-quote/shared';
import { CustomerForm } from '@/components/quote/CustomerForm';
import { Button, LinkButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, errorMessage } from '@/lib/api';
import { initials } from '@/lib/format';
import { keys, useCustomers, useDebounced } from '@/lib/queries';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const { data: customers, isLoading, error, refetch } = useCustomers(debounced);
  const [editing, setEditing] = useState<CustomerDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CustomerDTO | null>(null);

  const save = useMutation({
    mutationFn: (input: CustomerInput) =>
      editing && editing !== 'new' ? api.put<CustomerDTO>(`/customers/${editing.id}`, input) : api.post<CustomerDTO>('/customers', input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.customers });
      toast.success(editing === 'new' ? 'Customer added' : 'Customer updated');
      setEditing(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/customers/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.customers });
      toast.success('Customer deleted');
      setDeleting(null);
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setDeleting(null);
    },
  });

  return (
    <>
      <PageHeader title="Customers" subtitle="Reuse customer details on every new quotation." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Add customer</Button>} />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, mobile or city" aria-label="Search customers" className="input pl-10" />
      </div>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : customers && customers.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {customers.map((c) => (
            <li key={c.id} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">{initials(c.name)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-sans text-base font-bold text-ink">{c.name}</h3>
                  <a href={`tel:${c.mobile}`} className="mt-0.5 flex items-center gap-1.5 text-sm text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{formatMobile(c.mobile)}</a>
                  {c.email && <p className="flex items-center gap-1.5 truncate text-sm text-ink-muted"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</p>}
                  {(c.city || c.siteAddress) && <p className="flex items-center gap-1.5 truncate text-sm text-ink-muted"><MapPin className="h-3.5 w-3.5 shrink-0" />{c.siteAddress ?? c.city}</p>}
                </div>
                {!!c.quoteCount && <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-ink-muted">{c.quoteCount} quote{c.quoteCount > 1 ? 's' : ''}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-line pt-3">
                <LinkButton to={`/quotes/new?customer=${c.id}`} variant="secondary" size="sm" icon={<FilePlus2 className="h-4 w-4" />}>New quote</LinkButton>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Delete ${c.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState icon={<Users className="h-7 w-7" />} title={debounced ? 'No matching customers' : 'No customers yet'} action={!debounced && <Button onClick={() => setEditing('new')} icon={<Plus className="h-4 w-4" />}>Add your first customer</Button>}>
            {debounced ? 'Try a different name or number.' : 'Customers you add here can be reused on every quotation.'}
          </EmptyState>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add customer' : 'Edit customer'} size="md">
        {editing !== null && (
          <CustomerForm customer={editing === 'new' ? undefined : editing} loading={save.isPending} onSubmit={(v) => save.mutate(v)} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete customer?" confirmLabel="Delete" danger loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)}>
        <strong>{deleting?.name}</strong> will be removed. Customers with quotations cannot be deleted.
      </ConfirmDialog>
    </>
  );
}

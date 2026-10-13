import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatMobile, type CustomerDTO, type CustomerInput } from '@pool-quote/shared';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { keys, useCustomers, useDebounced } from '@/lib/queries';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Feedback';
import { CustomerForm } from './CustomerForm';

interface CustomerPickerProps {
  value: CustomerDTO | null;
  onChange: (customer: CustomerDTO) => void;
}

/** Search existing customers or add a new one without leaving the flow. */
export function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const debounced = useDebounced(search);
  const { data: customers, isFetching, isLoading } = useCustomers(debounced);

  const create = useMutation({
    mutationFn: (input: CustomerInput) => api.post<CustomerDTO>('/customers', input),
    onSuccess: async (customer) => {
      await qc.invalidateQueries({ queryKey: keys.customers });
      toast.success(`${customer.name} added`);
      setAdding(false);
      onChange(customer);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (adding) {
    return (
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-brand-900">
          <UserPlus className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-bold">New customer</h2>
        </div>
        <CustomerForm submitLabel="Save & select" loading={create.isPending} onSubmit={(v) => create.mutate(v)} onCancel={() => setAdding(false)} />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-line p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name or mobile number"
            aria-label="Search customers"
            className="input pl-10"
            autoFocus
          />
        </div>
      </div>

      <ul className="max-h-[22rem] divide-y divide-surface-line overflow-y-auto" aria-label="Customers">
        {isLoading && [0, 1, 2].map((i) => <li key={i} className="p-4"><Skeleton className="h-10" /></li>)}
        {customers?.map((c) => {
          const selected = value?.id === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChange(c)}
                aria-pressed={selected}
                className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-alt', selected && 'bg-brand-50')}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', selected ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-800')}>
                  {selected ? <Check className="h-5 w-5" /> : initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{c.name}</span>
                  <span className="block truncate text-sm text-ink-muted">{formatMobile(c.mobile)}{c.city ? ` · ${c.city}` : ''}</span>
                </span>
                {!!c.quoteCount && <span className="shrink-0 text-xs text-ink-muted">{c.quoteCount} quote{c.quoteCount > 1 ? 's' : ''}</span>}
              </button>
            </li>
          );
        })}
        {customers && customers.length === 0 && !isFetching && (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">
            {debounced ? `No customer matches “${debounced}”.` : 'No customers yet.'}
          </li>
        )}
      </ul>

      <div className="border-t border-surface-line bg-surface-alt/60 p-3">
        <Button variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)} className="w-full sm:w-auto">
          Add new customer
        </Button>
      </div>
    </div>
  );
}

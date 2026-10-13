import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { CustomerDTO, QuoteDTO } from '@pool-quote/shared';
import { CustomerPicker } from '@/components/quote/CustomerPicker';
import { StepIndicator } from '@/components/quote/StepIndicator';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, errorMessage } from '@/lib/api';
import { invalidateQuoteData } from '@/lib/quoteActions';

export default function NewQuotePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const presetId = params.get('customer');
  const [customer, setCustomer] = useState<CustomerDTO | null>(null);

  // Arriving from a customer card pre-selects that customer.
  const { data: preset } = useQuery({
    queryKey: ['customer', presetId],
    queryFn: () => api.get<CustomerDTO>(`/customers/${presetId}`),
    enabled: !!presetId,
  });
  const selected = customer ?? preset ?? null;

  const create = useMutation({
    mutationFn: (customerId: string) => api.post<QuoteDTO>('/quotes', { customerId }),
    onSuccess: async (quote) => {
      await invalidateQuoteData(qc);
      navigate(`/quotes/${quote.id}/edit?step=items`, { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator current="customer" />
      <PageHeader title="Who is this quotation for?" subtitle="Pick an existing customer or add a new one. You can change this later." />
      <CustomerPicker value={selected} onChange={setCustomer} />
      <div className="safe-bottom sticky bottom-20 z-10 mt-5 lg:bottom-4">
        <Button size="lg" className="w-full shadow-lift sm:w-auto" disabled={!selected} loading={create.isPending} onClick={() => selected && create.mutate(selected.id)} icon={undefined}>
          {selected ? `Continue with ${selected.name.split(' ')[0]}` : 'Select a customer'}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

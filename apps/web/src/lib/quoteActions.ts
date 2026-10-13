import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { QuoteDTO, QuoteStatus } from '@pool-quote/shared';
import { api, errorMessage } from './api';
import { keys } from './queries';

export const invalidateQuoteData = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: keys.quotes }),
    qc.invalidateQueries({ queryKey: keys.dashboard }),
    qc.invalidateQueries({ queryKey: ['quote'] }),
    qc.invalidateQueries({ queryKey: ['report'] }),
  ]);

/** Duplicate / revise / status / delete, shared by the list and the detail page. */
export function useQuoteActions() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const onError = (error: unknown) => toast.error(errorMessage(error));

  const duplicate = useMutation({
    mutationFn: (id: string) => api.post<QuoteDTO>(`/quotes/${id}/duplicate`),
    onSuccess: async (quote) => {
      await invalidateQuoteData(qc);
      toast.success(`Created ${quote.displayNumber} as a copy`);
      navigate(`/quotes/${quote.id}/edit`);
    },
    onError,
  });

  const revise = useMutation({
    mutationFn: (id: string) => api.post<QuoteDTO>(`/quotes/${id}/revise`),
    onSuccess: async (quote) => {
      await invalidateQuoteData(qc);
      toast.success(`Revision ${quote.displayNumber} created`);
      navigate(`/quotes/${quote.id}/edit`);
    },
    onError,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<QuoteStatus, 'DRAFT'> }) =>
      api.put<QuoteDTO>(`/quotes/${id}/status`, { status }),
    onSuccess: async (quote) => {
      qc.setQueryData(keys.quote(quote.id), quote);
      await invalidateQuoteData(qc);
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/quotes/${id}`),
    onSuccess: async () => {
      await invalidateQuoteData(qc);
      toast.success('Draft deleted');
      navigate('/quotes', { replace: true });
    },
    onError,
  });

  return { duplicate, revise, setStatus, remove };
}

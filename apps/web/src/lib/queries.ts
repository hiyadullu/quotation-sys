import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type {
  CustomerDTO,
  DashboardDTO,
  Paginated,
  ProductDTO,
  QuoteDTO,
  QuoteSummaryDTO,
  ReportDTO,
  SettingsDTO,
  ShareDefaultsDTO,
  TemplateDTO,
  UserDTO,
} from '@pool-quote/shared';
import { api, toQuery } from './api';

export const keys = {
  dashboard: ['dashboard'] as const,
  quotes: ['quotes'] as const,
  quote: (id: string) => ['quote', id] as const,
  customers: ['customers'] as const,
  products: ['products'] as const,
  templates: ['templates'] as const,
  settings: ['settings'] as const,
  users: ['users'] as const,
};

export const useDashboard = () =>
  useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<DashboardDTO>('/dashboard') });

export interface QuoteListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const useQuotes = (params: QuoteListParams) =>
  useQuery({
    queryKey: [...keys.quotes, params],
    queryFn: () => api.get<Paginated<QuoteSummaryDTO>>(`/quotes${toQuery({ ...params })}`),
    placeholderData: keepPreviousData,
  });

export const useQuote = (id: string | undefined) =>
  useQuery({
    queryKey: keys.quote(id ?? ''),
    queryFn: () => api.get<QuoteDTO>(`/quotes/${id}`),
    enabled: !!id,
  });

export const useShareDefaults = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ['share-defaults', id],
    queryFn: () => api.get<ShareDefaultsDTO>(`/quotes/${id}/share-defaults`),
    enabled,
    staleTime: 0,
    gcTime: 0,
  });

export const useCustomers = (search = '') =>
  useQuery({
    queryKey: [...keys.customers, search],
    queryFn: () => api.get<{ data: CustomerDTO[] }>(`/customers${toQuery({ search })}`).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

export const useProducts = (opts: { search?: string; category?: string; includeInactive?: boolean } = {}) =>
  useQuery({
    queryKey: [...keys.products, opts],
    queryFn: () =>
      api
        .get<{ data: ProductDTO[] }>(
          `/products${toQuery({ search: opts.search, category: opts.category, includeInactive: opts.includeInactive ? 'true' : undefined })}`,
        )
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

export const useTemplates = () =>
  useQuery({
    queryKey: keys.templates,
    queryFn: () => api.get<{ data: TemplateDTO[] }>('/templates').then((r) => r.data),
  });

export const useSettings = () =>
  useQuery({ queryKey: keys.settings, queryFn: () => api.get<SettingsDTO>('/settings') });

export const useUsers = () =>
  useQuery({ queryKey: keys.users, queryFn: () => api.get<{ data: UserDTO[] }>('/users').then((r) => r.data) });

export const useReport = (from: string, to: string) =>
  useQuery({
    queryKey: ['report', from, to],
    queryFn: () => api.get<ReportDTO>(`/reports${toQuery({ from, to })}`),
  });

export function useDebounced<T>(value: T, delay = 250): T {
  const [state, setState] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setState(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return state;
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { LoginInput, UserDTO } from '@pool-quote/shared';
import { api, ApiError } from '@/lib/api';

interface AuthState {
  user: UserDTO | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const ME_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await api.get<{ user: UserDTO }>('/auth/me')).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const login = useCallback(
    async (input: LoginInput) => {
      const { user: signedIn } = await api.post<{ user: UserDTO }>('/auth/login', input);
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, signedIn);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    queryClient.clear();
    queryClient.setQueryData(ME_KEY, null);
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({ user: user ?? null, isLoading, isAdmin: user?.role === 'ADMIN', login, logout }),
    [user, isLoading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

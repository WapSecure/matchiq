'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { API_LIMITS } from '@/constants/api';
import { useSession } from '@/lib/auth/session-store';
import { isSessionExpired } from '@/lib/errors/humanize-error';
import { isApiError } from './api-error';

/** Any 401 ends a signed-in session (a no-op when signed out); the notice says so once. */
const watchSession = (error: unknown): void => {
  if (isSessionExpired(error)) useSession.getState().markExpired();
};

const shouldRetry = (failureCount: number, error: unknown): boolean =>
  failureCount < API_LIMITS.queryRetries &&
  (!isApiError(error) || error.retryable);

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    queryCache: new QueryCache({ onError: watchSession }),
    mutationCache: new MutationCache({ onError: watchSession }),
    defaultOptions: {
      queries: { staleTime: API_LIMITS.queryStaleMs, retry: shouldRetry },
      mutations: { retry: false },
    },
  });

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { API_LIMITS } from '@/constants/api';
import { isApiError } from './api-error';

const shouldRetry = (failureCount: number, error: unknown): boolean =>
  failureCount < API_LIMITS.queryRetries &&
  (!isApiError(error) || error.retryable);

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: API_LIMITS.queryStaleMs, retry: shouldRetry },
      mutations: { retry: false },
    },
  });

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

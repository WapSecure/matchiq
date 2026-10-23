'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { API_LIMITS } from '@/constants/api';
import { isSignedIn } from '@/lib/auth/session-store';
import { isSessionExpired } from '@/lib/errors/humanize-error';
import { markSessionExpired } from '@/lib/errors/session-expiry';
import { isApiError } from './api-error';

/** A signed-in user refused with 401 has lost their session; say so once, calmly. */
const watchSession = (error: unknown): void => {
  if (isSignedIn() && isSessionExpired(error)) markSessionExpired();
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

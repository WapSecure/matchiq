'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  type AuditFilters,
  fetchAuditEvents,
} from '@/lib/api/editorial-endpoints';
import { queryKeys } from '@/lib/api/query-keys';

/** Newest first; each page's opaque `nextCursor` loads the next, older page. */
export const useAuditEvents = (filters: AuditFilters, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: queryKeys.auditEvents(filters),
    queryFn: ({ pageParam, signal }) =>
      fetchAuditEvents(filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
  });

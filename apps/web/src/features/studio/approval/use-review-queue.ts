'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { fetchOverlayReviews } from '@/lib/api/review-endpoints';
import { useCan } from '@/lib/auth/session-store';
import { useMatchStore } from '../store';

/**
 * The producer's approval queue. Each `overlay.review` frame bumps the
 * version, so the queue reloads exactly when a cue starts or stops waiting.
 */
export const useReviewQueue = () => {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const version = useMatchStore((s) => s.reviewVersion);
  const allowed = useCan('editorial:approve');
  const query = useQuery({
    queryKey: queryKeys.overlayReviews(fixtureId, version),
    queryFn: ({ signal }) => fetchOverlayReviews(fixtureId, signal),
    enabled: allowed,
    placeholderData: keepPreviousData,
  });
  return { allowed, query };
};

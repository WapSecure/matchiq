'use client';

import type { ReviewInsightCommand } from '@matchiq/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { APPROVAL_COPY } from '@/constants/approval';
import { queryKeys } from '@/lib/api/query-keys';
import {
  describeReviewProblem,
  reviewInsight,
} from '@/lib/api/review-endpoints';
import { useEditorialNotice } from '../editorial/notice-store';
import { useMatchStore } from '../store';

/** Drops the version segment so every version of the queue is refreshed. */
const queuePrefix = (fixtureId: string) =>
  queryKeys.overlayReviews(fixtureId, 0).slice(0, -1);

/**
 * One review decision. Retrying the same decision reuses its
 * `Idempotency-Key`, so a lost response never sends a cue to air twice.
 */
export const useReviewDecision = (insightId: string | null) => {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const show = useEditorialNotice((s) => s.show);
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, string>());
  const mutation = useMutation({
    mutationFn: (command: ReviewInsightCommand) => {
      const id = JSON.stringify(command);
      const key = keys.current.get(id) ?? crypto.randomUUID();
      keys.current.set(id, key);
      return reviewInsight(insightId ?? '', command, key);
    },
    onSuccess: (result) => {
      const done =
        result.state === 'APPROVED'
          ? APPROVAL_COPY.done.APPROVED
          : APPROVAL_COPY.done.REJECTED;
      show(result.changed ? done : APPROVAL_COPY.noop, result.changed);
      void queryClient.invalidateQueries({ queryKey: queuePrefix(fixtureId) });
    },
  });
  return {
    decide: (command: ReviewInsightCommand) => mutation.mutate(command),
    pending: mutation.isPending ? (mutation.variables?.decision ?? null) : null,
    error: mutation.isError ? mutation.error : null,
    message: mutation.isError ? describeReviewProblem(mutation.error) : null,
    disabled: insightId === null,
  };
};

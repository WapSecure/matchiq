import {
  EditorialStatusResult,
  OverlayReviewList,
  ReviewInsightCommand,
  ReviewInsightResult,
  SetPublishPolicyCommand,
  type PublishPolicy,
} from '@matchiq/contracts';
import { REVIEW_PROBLEMS } from '@/constants/approval';
import { API_PATHS, HTTP_HEADERS } from '@/constants/api';
import { isApiError } from './api-error';
import { describeEditorialProblem } from './describe-editorial-problem';
import type { CommandInput } from './editorial-endpoints';
import { requestJson } from './http-client';

export const fetchOverlayReviews = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.overlayReviews(fixtureId), OverlayReviewList, {
    signal,
  });

export const reviewInsight = (
  insightId: string,
  command: ReviewInsightCommand,
  idempotencyKey: string,
) =>
  requestJson(API_PATHS.review(insightId), ReviewInsightResult, {
    method: 'POST',
    body: ReviewInsightCommand.parse(command),
    headers: { [HTTP_HEADERS.idempotencyKey]: idempotencyKey },
  });

export const setPublishPolicy = (
  fixtureId: string,
  policy: PublishPolicy,
  { reason, idempotencyKey }: CommandInput,
) =>
  requestJson(API_PATHS.publishPolicy(fixtureId), EditorialStatusResult, {
    method: 'POST',
    body: SetPublishPolicyCommand.parse({ policy, reason }),
    headers: { [HTTP_HEADERS.idempotencyKey]: idempotencyKey },
  });

/** A review conflict in producer words; anything else as other producer commands. */
export const describeReviewProblem = (error: unknown): string => {
  const slug = isApiError(error)
    ? error.problem.type.split(':').at(-1)
    : undefined;
  return (slug && REVIEW_PROBLEMS[slug]) ?? describeEditorialProblem(error);
};

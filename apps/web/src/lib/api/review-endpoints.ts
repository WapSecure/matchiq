import {
  EditorialStatusResult,
  OverlayReviewList,
  ReviewInsightCommand,
  ReviewInsightResult,
  SetPublishPolicyCommand,
  type PublishPolicy,
} from '@matchiq/contracts';
import { API_PATHS, HTTP_HEADERS } from '@/constants/api';
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

/** Review conflicts have their own problem copy, like every other producer command. */
export const describeReviewProblem = describeEditorialProblem;

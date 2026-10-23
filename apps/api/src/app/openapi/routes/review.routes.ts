import {
  EditorialStatusResult,
  InsightId,
  OverlayReviewList,
  ReviewInsightCommand,
  ReviewInsightResult,
  SetPublishPolicyCommand,
} from '@matchiq/contracts';
import { z } from 'zod';
import { TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';
import { FixturePath } from './fixture.routes';

/** Approve-before-air (spec §29, §31.4, §45; ADR-0023). */
export const REVIEW_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'listOverlayReviews',
    method: 'get',
    path: '/fixtures/{fixtureId}/overlay-reviews',
    tag: TAGS.editorial,
    summary: 'Cues waiting for a producer to approve them',
    description:
      'MANUAL sessions only. Each item carries the copy it would air and the match clock at which its slot closes.',
    auth: 'editorial:approve',
    params: FixturePath,
    success: {
      status: 200,
      description: 'The approval queue, oldest first',
      body: json(OverlayReviewList),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'reviewInsight',
    method: 'post',
    path: '/insights/{insightId}/review',
    tag: TAGS.editorial,
    summary: "Approve or reject an insight's waiting cue",
    description:
      'Approve airs the cue in the slot the scheduler gave it, with optional duration and priority overrides; reject means it never airs. A cue whose slot has closed answers 409.',
    auth: 'editorial:approve',
    params: z.strictObject({ insightId: InsightId }),
    body: ReviewInsightCommand,
    idempotent: true,
    success: {
      status: 200,
      description: 'Reviewed, or already in that state (`changed: false`)',
      body: json(ReviewInsightResult),
    },
    problems: [
      'badRequest',
      'validation',
      'invalidHeader',
      'idempotencyMismatch',
      'insightNotFound',
      'overlayNotFound',
      'overlayNotAwaiting',
      'approvalExpired',
      'reviewStale',
      'airPaused',
    ],
  },
  {
    operationId: 'setPublishPolicy',
    method: 'post',
    path: '/fixtures/{fixtureId}/editorial/publish-policy',
    tag: TAGS.editorial,
    summary: 'Publish cues automatically or after a producer approves each one',
    auth: 'policy:configure',
    params: FixturePath,
    body: SetPublishPolicyCommand,
    idempotent: true,
    success: {
      status: 200,
      description: 'Changed, or already set (`changed: false`)',
      body: json(EditorialStatusResult),
    },
    problems: [
      'badRequest',
      'validation',
      'invalidHeader',
      'idempotencyMismatch',
      'fixtureNotFound',
    ],
  },
];

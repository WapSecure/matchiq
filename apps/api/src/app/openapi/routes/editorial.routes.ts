import {
  AuditEventPage,
  AuditEventQuery,
  EditorialCommand,
  EditorialStatus,
  EditorialStatusResult,
  InsightId,
  KillSwitchResult,
  KillSwitchStatus,
  OverlayId,
  RetractOverlayResult,
  SuppressInsightResult,
} from '@matchiq/contracts';
import { z } from 'zod';
import { TAGS } from '../openapi.constants';
import type { ProblemRef } from '../problem-catalog';
import { type ApiRoute, json } from '../route-types';
import { FixturePath } from './fixture.routes';

const COMMAND_PROBLEMS: readonly ProblemRef[] = [
  'badRequest',
  'unauthorized',
  'forbidden',
  'validation',
  'invalidHeader',
  'idempotencyMismatch',
];

const publish = {
  kind: 'permission',
  permission: 'editorial:publish',
} as const;

const command = (
  route: Omit<ApiRoute, 'tag' | 'method' | 'body' | 'idempotent' | 'auth'> & {
    auth?: ApiRoute['auth'];
  },
): ApiRoute => ({
  tag: TAGS.editorial,
  method: 'post',
  body: EditorialCommand,
  idempotent: true,
  auth: publish,
  ...route,
});

export const EDITORIAL_ROUTES: readonly ApiRoute[] = [
  command({
    operationId: 'retractOverlay',
    path: '/overlays/{overlayId}/retract',
    summary: 'Take an on-air overlay cue off air',
    params: z.strictObject({ overlayId: OverlayId }),
    success: {
      status: 200,
      description: 'Retracted, or already retracted (`changed: false`)',
      body: json(RetractOverlayResult),
    },
    problems: [...COMMAND_PROBLEMS, 'overlayNotFound', 'overlayNotOnAir'],
  }),
  command({
    operationId: 'suppressInsight',
    path: '/insights/{insightId}/suppress',
    summary: 'Suppress an insight before its narratives publish',
    auth: { kind: 'permission', permission: 'editorial:approve' },
    params: z.strictObject({ insightId: InsightId }),
    success: {
      status: 200,
      description: 'Suppressed',
      body: json(SuppressInsightResult),
    },
    problems: [...COMMAND_PROBLEMS, 'insightNotFound', 'insightPublished'],
  }),
  {
    operationId: 'getEditorialStatus',
    method: 'get',
    path: '/fixtures/{fixtureId}/editorial',
    tag: TAGS.editorial,
    summary: 'Effective on-air policy for a fixture',
    description:
      'Public: viewers render a "graphics paused" state from this and `editorial.status`.',
    auth: { kind: 'public' },
    params: FixturePath,
    success: {
      status: 200,
      description: 'Editorial status',
      body: json(EditorialStatus),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
  command({
    operationId: 'freezeFixture',
    path: '/fixtures/{fixtureId}/editorial/freeze',
    summary: 'Hold new cues for one session',
    params: FixturePath,
    success: {
      status: 200,
      description: 'Frozen, or already frozen',
      body: json(EditorialStatusResult),
    },
    problems: [...COMMAND_PROBLEMS, 'fixtureNotFound'],
  }),
  command({
    operationId: 'resumeFixture',
    path: '/fixtures/{fixtureId}/editorial/resume',
    summary: 'Lift a session freeze',
    params: FixturePath,
    success: {
      status: 200,
      description: 'Resumed, or already live',
      body: json(EditorialStatusResult),
    },
    problems: [...COMMAND_PROBLEMS, 'fixtureNotFound'],
  }),
  {
    operationId: 'getKillSwitch',
    method: 'get',
    path: '/editorial/kill-switch',
    tag: TAGS.editorial,
    summary: 'Organisation kill switch state',
    auth: { kind: 'public' },
    success: {
      status: 200,
      description: 'Kill switch',
      body: json(KillSwitchStatus),
    },
    problems: [],
  },
  command({
    operationId: 'activateKillSwitch',
    path: '/editorial/kill-switch/activate',
    summary: 'Take every cue off air across the organisation',
    success: {
      status: 200,
      description: 'Activated',
      body: json(KillSwitchResult),
    },
    problems: COMMAND_PROBLEMS,
  }),
  command({
    operationId: 'releaseKillSwitch',
    path: '/editorial/kill-switch/release',
    summary: 'Release the organisation kill switch',
    success: {
      status: 200,
      description: 'Released',
      body: json(KillSwitchResult),
    },
    problems: COMMAND_PROBLEMS,
  }),
  {
    operationId: 'listAuditEvents',
    method: 'get',
    path: '/audit-events',
    tag: TAGS.audit,
    summary: "The caller organisation's audit trail, newest first",
    description:
      'Keyset pagination: pass `nextCursor` back as `cursor` until it is null.',
    auth: { kind: 'permission', permission: 'audit:read' },
    query: AuditEventQuery,
    success: {
      status: 200,
      description: 'One page of audit events',
      body: json(AuditEventPage),
    },
    problems: ['unauthorized', 'forbidden', 'validation', 'invalidCursor'],
  },
];

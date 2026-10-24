import {
  AccessProfile,
  PreferenceProfile,
  StreamTicket,
  ViewerPreferences,
} from '@matchiq/contracts';
import { TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';
import { FixturePath } from './fixture.routes';

const NO_CONTENT = { kind: 'none' } as const;

export const IDENTITY_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'issueStreamTicket',
    method: 'post',
    path: '/fixtures/{fixtureId}/stream-tickets',
    tag: TAGS.stream,
    summary: 'Issue a short-lived ticket that opens this fixture stream',
    description:
      '`EventSource` cannot send headers: pass the ticket as `?ticket=` on `/stream`. Bound to the caller, organisation and fixture; valid for `STREAM_TICKET_TTL_SECONDS` (ADR-0018).',
    auth: 'fixtures:read',
    params: FixturePath,
    success: { status: 201, description: 'Ticket', body: json(StreamTicket) },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'getMe',
    method: 'get',
    path: '/me',
    tag: TAGS.identity,
    summary: 'The caller as the API sees it',
    description:
      'Roles and permissions are display hints; the API enforces them per route.',
    auth: 'authenticated',
    success: {
      status: 200,
      description: 'Access profile',
      body: json(AccessProfile),
    },
    problems: [],
  },
  {
    operationId: 'recordSignIn',
    method: 'post',
    path: '/me/sign-in',
    tag: TAGS.identity,
    summary: 'Record a sign-in in the audit trail (called by the web BFF)',
    auth: 'authenticated',
    success: { status: 204, description: 'Recorded', body: NO_CONTENT },
    problems: [],
  },
  {
    operationId: 'recordSignOut',
    method: 'post',
    path: '/me/sign-out',
    tag: TAGS.identity,
    summary: 'Record a sign-out in the audit trail (called by the web BFF)',
    auth: 'authenticated',
    success: { status: 204, description: 'Recorded', body: NO_CONTENT },
    problems: [],
  },
  {
    operationId: 'getMyPreferences',
    method: 'get',
    path: '/me/preferences',
    tag: TAGS.identity,
    summary: "The caller's saved viewing preferences",
    description:
      'Persona, language, favourite team, followed players (at most three) and reduced motion. A caller who has never saved gets the defaults with `updatedAt: null`. Presentation only: no statistic depends on it.',
    auth: 'preferences:write',
    success: {
      status: 200,
      description: 'Preference profile',
      body: json(PreferenceProfile),
    },
    problems: [],
  },
  {
    operationId: 'putMyPreferences',
    method: 'put',
    path: '/me/preferences',
    tag: TAGS.identity,
    summary: "Replace the caller's viewing preferences",
    description:
      'Replaces the whole profile. Idempotent: repeating the same body changes nothing, `updatedAt` included. Scoped to the caller and their organisation.',
    auth: 'preferences:write',
    body: ViewerPreferences,
    success: {
      status: 200,
      description: 'Saved profile',
      body: json(PreferenceProfile),
    },
    problems: ['badRequest', 'validation'],
  },
];

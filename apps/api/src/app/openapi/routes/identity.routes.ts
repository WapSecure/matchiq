import { AccessProfile, StreamTicket } from '@matchiq/contracts';
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
      '`EventSource` cannot send headers: pass the ticket as `?ticket=` on `/stream`. Bound to the caller, organisation and fixture; valid for `STREAM_TICKET_TTL_SECONDS` (ADR-0015).',
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
];

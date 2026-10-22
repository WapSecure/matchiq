import {
  CreatedSession,
  FixtureTemplateList,
  ReplayCommand,
  ReplaySessionList,
  ReplayStatus,
} from '@matchiq/contracts';
import {
  CreateSessionBody,
  SessionListQuery,
} from '../../replay/replay.schemas';
import { TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';
import { FixturePath } from './fixture.routes';

const REPLAY_LIMITS =
  'Anonymous and rate-limited per client by the stricter `replay` bucket (ADR-0010).';

export const REPLAY_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'listFixtureTemplates',
    method: 'get',
    path: '/fixture-templates',
    tag: TAGS.replay,
    summary: 'List replayable fixture templates (the lobby)',
    auth: 'fixtures:read',
    success: {
      status: 200,
      description: 'Templates',
      body: json(FixtureTemplateList),
    },
    problems: [],
  },
  {
    operationId: 'listReplaySessions',
    method: 'get',
    path: '/replay-sessions',
    tag: TAGS.replay,
    summary: 'List recent replay sessions to join',
    auth: 'fixtures:read',
    query: SessionListQuery,
    success: {
      status: 200,
      description: 'Sessions, most recent first',
      body: json(ReplaySessionList),
    },
    problems: ['validation'],
  },
  {
    operationId: 'createReplaySession',
    method: 'post',
    path: '/fixtures/{fixtureId}/sessions',
    tag: TAGS.replay,
    summary: 'Start a new replay session of a template',
    description: `\`fixtureId\` is the template. The session gets its own fixture and ledger. ${REPLAY_LIMITS}`,
    auth: 'replay:control',
    params: FixturePath,
    body: CreateSessionBody,
    idempotent: true,
    success: {
      status: 201,
      description: 'Created',
      body: json(CreatedSession),
    },
    problems: [
      'badRequest',
      'validation',
      'templateNotFound',
      'replayCapacity',
      'invalidHeader',
      'idempotencyMismatch',
      'demoFaultsDisabled',
    ],
  },
  {
    operationId: 'sendReplayCommand',
    method: 'post',
    path: '/fixtures/{fixtureId}/replay',
    tag: TAGS.replay,
    summary: 'Start, pause, resume, change speed or seek a session',
    description: `The worker applies the command; the resulting status also arrives as \`replay.status\` on the stream. ${REPLAY_LIMITS}`,
    auth: 'replay:control',
    params: FixturePath,
    body: ReplayCommand,
    idempotent: true,
    success: {
      status: 202,
      description: 'Accepted; the expected status after the command',
      body: json(ReplayStatus),
    },
    problems: [
      'badRequest',
      'validation',
      'sessionNotFound',
      'templateNotFound',
      'replayConflict',
      'replayCapacity',
      'replayUnavailable',
      'invalidHeader',
      'idempotencyMismatch',
    ],
  },
  {
    operationId: 'getReplayStatus',
    method: 'get',
    path: '/fixtures/{fixtureId}/replay',
    tag: TAGS.replay,
    summary: 'Get the persisted replay status of a session',
    auth: 'fixtures:read',
    params: FixturePath,
    success: {
      status: 200,
      description: 'Replay status',
      body: json(ReplayStatus),
    },
    problems: ['validation', 'sessionNotFound'],
  },
];

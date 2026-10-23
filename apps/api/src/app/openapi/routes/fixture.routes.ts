import {
  EventPage,
  Fixture,
  FixtureId,
  FixtureList,
  IngestBatchRequest,
  IngestBatchResponse,
} from '@matchiq/contracts';
import { z } from 'zod';
import {
  EventPageQuery,
  FixtureListQuery,
  StreamQuery,
} from '../../fixtures/fixtures.schemas';
import { KEYSET_TEXT, STREAM_TEXT, TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';

export const FixturePath = z.strictObject({ fixtureId: FixtureId });

export const FIXTURE_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'createFixture',
    method: 'post',
    path: '/fixtures',
    tag: TAGS.fixtures,
    summary: 'Create a synthetic fixture',
    auth: 'fixtures:write',
    body: Fixture,
    idempotent: true,
    success: { status: 201, description: 'Created', body: json(Fixture) },
    problems: [
      'badRequest',
      'validation',
      'fixtureExists',
      'invalidHeader',
      'idempotencyMismatch',
    ],
  },
  {
    operationId: 'listFixtures',
    method: 'get',
    path: '/fixtures',
    tag: TAGS.fixtures,
    summary: 'List fixtures in kickoff order',
    description: KEYSET_TEXT,
    auth: 'fixtures:read',
    query: FixtureListQuery,
    success: {
      status: 200,
      description: 'One page of fixtures',
      body: json(FixtureList),
    },
    problems: ['validation', 'invalidCursor'],
  },
  {
    operationId: 'getFixture',
    method: 'get',
    path: '/fixtures/{fixtureId}',
    tag: TAGS.fixtures,
    summary: 'Get one fixture with teams and squads',
    auth: 'fixtures:read',
    params: FixturePath,
    success: { status: 200, description: 'The fixture', body: json(Fixture) },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'listFixtureEvents',
    method: 'get',
    path: '/fixtures/{fixtureId}/events',
    tag: TAGS.fixtures,
    summary: 'Page through the event ledger in sequence order',
    description:
      'Keyset pagination: pass `nextAfterSequence` back as `afterSequence` until it is null.',
    auth: 'fixtures:read',
    params: FixturePath,
    query: EventPageQuery,
    success: {
      status: 200,
      description: 'One page of events',
      body: json(EventPage),
    },
    problems: ['validation', 'fixtureNotFound'],
  },
  {
    operationId: 'ingestEvents',
    method: 'post',
    path: '/fixtures/{fixtureId}/events:batch',
    tag: TAGS.fixtures,
    summary: 'Append a batch of events to the ledger',
    description:
      'Duplicates (same eventId and body) are counted and ignored; a changed body is a 409.',
    auth: 'events:ingest',
    params: FixturePath,
    body: IngestBatchRequest,
    idempotent: true,
    success: {
      status: 202,
      description: 'Accepted for projection',
      body: json(IngestBatchResponse),
    },
    problems: [
      'badRequest',
      'validation',
      'fixtureNotFound',
      'fixtureMismatch',
      'eventConflict',
      'invalidHeader',
      'idempotencyMismatch',
    ],
  },
  {
    operationId: 'streamFixture',
    method: 'get',
    path: '/fixtures/{fixtureId}/stream',
    tag: TAGS.stream,
    summary: 'Subscribe to the fixture stream (SSE)',
    description: STREAM_TEXT.description,
    auth: 'fixtures:read',
    params: FixturePath,
    query: StreamQuery,
    success: {
      status: 200,
      description: 'An open event stream',
      body: { kind: 'stream' },
    },
    problems: [
      'validation',
      'invalidHeader',
      'fixtureNotFound',
      'streamUnavailable',
    ],
  },
];

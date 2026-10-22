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
import { STREAM_TEXT, TAGS } from '../openapi.constants';
import { type ApiRoute, json } from '../route-types';

export const FixturePath = z.strictObject({ fixtureId: FixtureId });

export const FIXTURE_ROUTES: readonly ApiRoute[] = [
  {
    operationId: 'createFixture',
    method: 'post',
    path: '/fixtures',
    tag: TAGS.fixtures,
    summary: 'Create a synthetic fixture',
    auth: { kind: 'operator' },
    body: Fixture,
    idempotent: true,
    success: { status: 201, description: 'Created', body: json(Fixture) },
    problems: [
      'badRequest',
      'validation',
      'unauthorized',
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
    summary: 'List fixtures, newest first (bounded by `limit`, no cursor)',
    auth: { kind: 'public' },
    query: FixtureListQuery,
    success: { status: 200, description: 'Fixtures', body: json(FixtureList) },
    problems: ['validation'],
  },
  {
    operationId: 'getFixture',
    method: 'get',
    path: '/fixtures/{fixtureId}',
    tag: TAGS.fixtures,
    summary: 'Get one fixture with teams and squads',
    auth: { kind: 'public' },
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
    auth: { kind: 'public' },
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
    auth: { kind: 'operator' },
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
      'unauthorized',
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
    auth: { kind: 'public' },
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

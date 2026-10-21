import {
  Fixture,
  MatchSnapshot,
  ReplayCommand,
  type ReplayCommand as ReplayCommandType,
} from '@matchiq/contracts';
import { z } from 'zod';
import { API_LIMITS, API_PATHS, HTTP_HEADERS } from '@/constants/api';
import { requestJson } from './http-client';
import { MatchEventPage, ReplayCommandAck } from './schemas';

/** `GET /fixtures` wraps the list: `{ items: Fixture[] }`. */
const FixtureList = z
  .object({ items: z.array(Fixture) })
  .transform((page) => page.items);

export type EventsQuery = { afterSequence?: number; limit?: number };

export const fetchFixtures = (signal?: AbortSignal) =>
  requestJson(API_PATHS.fixtures, FixtureList, { signal });

export const fetchFixture = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.fixture(fixtureId), Fixture, { signal });

export const fetchFixtureEvents = (
  fixtureId: string,
  query: EventsQuery = {},
  signal?: AbortSignal,
) =>
  requestJson(API_PATHS.events(fixtureId), MatchEventPage, {
    signal,
    query: {
      afterSequence: query.afterSequence,
      limit: query.limit ?? API_LIMITS.eventsPageSize,
    },
  });

export const fetchMatchState = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.state(fixtureId), MatchSnapshot, { signal });

export const sendReplayCommand = (
  fixtureId: string,
  command: ReplayCommandType,
) =>
  requestJson(API_PATHS.replay(fixtureId), ReplayCommandAck, {
    method: 'POST',
    body: ReplayCommand.parse(command),
    headers: { [HTTP_HEADERS.idempotencyKey]: crypto.randomUUID() },
  });

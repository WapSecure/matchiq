import {
  Fixture,
  type Locale,
  MatchSnapshot,
  type Persona,
  ReplayCommand,
  type ReplayCommand as ReplayCommandType,
  type FaultPlanInput,
  type ReplaySpeed,
  ReplayStatus,
  StreamTicket,
} from '@matchiq/contracts';
import { API_LIMITS, API_PATHS, HTTP_HEADERS } from '@/constants/api';
import { requestJson } from './http-client';
import { MatchEventPage, ReplayCommandAck } from './schemas';
import {
  CreatedSession,
  type FixtureTemplateSummary,
  InsightList,
  NarrativeList,
  OverlayList,
  RecapDocument,
  SessionPage,
  TemplatePage,
} from './session-schemas';
import { TraceList } from './trace-schemas';
import { validated } from './typed-client';

export type EventsQuery = { afterSequence?: number; limit?: number };
export type NarrativeQuery = { persona: Persona; locale: Locale };

const idempotent = () => ({
  [HTTP_HEADERS.idempotencyKey]: crypto.randomUUID(),
});

export type PageRequest = { cursor?: string; limit: number };

/**
 * The whole catalogue, following `nextCursor`: match codes and numbered lobby
 * pages need every match, and the catalogue is a small seeded list. Uses the
 * generated client (`@matchiq/api-client`); the rest still use `requestJson`.
 */
export const fetchTemplates = async (signal?: AbortSignal) => {
  const items: FixtureTemplateSummary[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < API_LIMITS.templatePagesMax; page += 1) {
    // The API's default page is its maximum, so the first request needs no query.
    const query = cursor === undefined ? {} : { cursor };
    const next = await validated(
      (client) =>
        client.GET('/fixture-templates', { signal, params: { query } }),
      TemplatePage,
    );
    items.push(...next.items);
    cursor = next.nextCursor ?? undefined;
    if (cursor === undefined) break;
  }
  return items;
};

/** One page of recent replays, newest first. */
export const fetchSessionsPage = (page: PageRequest, signal?: AbortSignal) =>
  requestJson(API_PATHS.sessions, SessionPage, {
    signal,
    query: { limit: page.limit, cursor: page.cursor },
  });

/** Creates a fresh session of a template; the worker starts it at `speed`. */
export const createSession = (
  templateId: string,
  speed: ReplaySpeed,
  faultPlan?: FaultPlanInput,
) =>
  requestJson(API_PATHS.createSession(templateId), CreatedSession, {
    method: 'POST',
    body: { speed, ...(faultPlan && { faultPlan }) },
    headers: idempotent(),
  });

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

export const fetchReplayStatus = (sessionId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.replay(sessionId), ReplayStatus, { signal });

export const sendReplayCommand = (
  sessionId: string,
  command: ReplayCommandType,
) =>
  requestJson(API_PATHS.replay(sessionId), ReplayCommandAck, {
    method: 'POST',
    body: ReplayCommand.parse(command),
    headers: idempotent(),
  });

export const fetchInsights = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.insights(fixtureId), InsightList, { signal });

export const fetchNarratives = (
  fixtureId: string,
  query: NarrativeQuery,
  signal?: AbortSignal,
) =>
  requestJson(API_PATHS.narratives(fixtureId), NarrativeList, {
    signal,
    query,
  });

export const fetchOverlays = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.overlays(fixtureId), OverlayList, { signal });

export const fetchRecap = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.recap(fixtureId), RecapDocument, { signal });

export const fetchAgentRuns = (fixtureId: string, signal?: AbortSignal) =>
  requestJson(API_PATHS.agentRuns(fixtureId), TraceList, { signal });

/** Via the BFF for signed-in users; the ticket then opens the stream on the API directly. */
export const fetchStreamTicket = (fixtureId: string) =>
  requestJson(API_PATHS.streamTicket(fixtureId), StreamTicket, {
    method: 'POST',
  });

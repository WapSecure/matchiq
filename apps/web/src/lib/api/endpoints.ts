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
  InsightList,
  NarrativeList,
  OverlayList,
  RecapDocument,
  SessionList,
  TemplateList,
} from './session-schemas';
import { TraceList } from './trace-schemas';

export type EventsQuery = { afterSequence?: number; limit?: number };
export type NarrativeQuery = { persona: Persona; locale: Locale };

const idempotent = () => ({
  [HTTP_HEADERS.idempotencyKey]: crypto.randomUUID(),
});

export const fetchTemplates = (signal?: AbortSignal) =>
  requestJson(API_PATHS.templates, TemplateList, { signal });

export const fetchSessions = (
  limit: number = API_LIMITS.sessionListLimit,
  signal?: AbortSignal,
) => requestJson(API_PATHS.sessions, SessionList, { signal, query: { limit } });

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

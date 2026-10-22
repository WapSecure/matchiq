import * as contracts from '@matchiq/contracts';
import { REQUEST_ID_PATTERN } from '@matchiq/server-kit';
import { z } from 'zod';
import { PATTERNS } from '../constants';
import { HEADER_TEXT } from './openapi.constants';

/** Header names exactly as clients send and receive them. */
export const HEADER = {
  idempotencyKey: 'Idempotency-Key',
  idempotentReplayed: 'Idempotent-Replayed',
  retryAfter: 'Retry-After',
  lastEventId: 'Last-Event-ID',
  requestId: 'X-Request-ID',
} as const;

export const IdempotencyKeyParam = z
  .string()
  .regex(PATTERNS.idempotencyKey)
  .optional()
  .meta({
    description: HEADER_TEXT.idempotencyKey,
    param: { id: 'IdempotencyKey', in: 'header', name: HEADER.idempotencyKey },
  });

export const RequestIdParam = z
  .string()
  .regex(REQUEST_ID_PATTERN)
  .optional()
  .meta({
    description: HEADER_TEXT.requestId,
    param: { id: 'RequestId', in: 'header', name: HEADER.requestId },
  });

export const LastEventIdParam = z
  .string()
  .regex(PATTERNS.nonNegativeInteger)
  .optional()
  .meta({
    description: HEADER_TEXT.lastEventId,
    param: { id: 'LastEventId', in: 'header', name: HEADER.lastEventId },
  });

export const RequestIdHeader = z.string().meta({
  description: HEADER_TEXT.requestId,
  header: { id: 'RequestId' },
});

export const IdempotentReplayedHeader = z
  .literal('true')
  .optional()
  .meta({
    description: HEADER_TEXT.idempotentReplayed,
    header: { id: 'IdempotentReplayed' },
  });

export const RetryAfterHeader = z
  .string()
  .regex(PATTERNS.nonNegativeInteger)
  .meta({
    description: HEADER_TEXT.retryAfter,
    header: { id: 'RetryAfter' },
  });

/**
 * Contracts published as named components so generated clients get stable
 * type names. Anything else is inlined where it is used.
 */
export const NAMED_SCHEMAS = {
  ProblemDetails: contracts.ProblemDetails,
  StreamMessage: contracts.StreamMessage,
  Fixture: contracts.Fixture,
  FixtureList: contracts.FixtureList,
  MatchEvent: contracts.MatchEvent,
  EventPage: contracts.EventPage,
  IngestBatchRequest: contracts.IngestBatchRequest,
  IngestBatchResponse: contracts.IngestBatchResponse,
  MatchSnapshot: contracts.MatchSnapshot,
  Insight: contracts.Insight,
  Narrative: contracts.Narrative,
  OverlayCue: contracts.OverlayCue,
  AgentRun: contracts.AgentRun,
  ReplayCommand: contracts.ReplayCommand,
  ReplayStatus: contracts.ReplayStatus,
  FixtureTemplateSummary: contracts.FixtureTemplateSummary,
  FixtureTemplateList: contracts.FixtureTemplateList,
  ReplaySessionView: contracts.ReplaySessionView,
  ReplaySessionList: contracts.ReplaySessionList,
  CreatedSession: contracts.CreatedSession,
  RecapDocument: contracts.RecapDocument,
  RecapMoment: contracts.RecapMoment,
  GateReport: contracts.GateReport,
  InsightTrace: contracts.InsightTrace,
  InsightTraceList: contracts.InsightTraceList,
  InsightList: contracts.InsightList,
  NarrativeList: contracts.NarrativeList,
  OverlayList: contracts.OverlayList,
  EditorialCommand: contracts.EditorialCommand,
  EditorialStatus: contracts.EditorialStatus,
  EditorialStatusResult: contracts.EditorialStatusResult,
  KillSwitchStatus: contracts.KillSwitchStatus,
  KillSwitchResult: contracts.KillSwitchResult,
  RetractOverlayResult: contracts.RetractOverlayResult,
  SuppressInsightResult: contracts.SuppressInsightResult,
  AuditEvent: contracts.AuditEvent,
  AuditEventPage: contracts.AuditEventPage,
  HealthStatus: contracts.HealthStatus,
  StreamTicket: contracts.StreamTicket,
  AccessProfile: contracts.AccessProfile,
} as const;

import { z } from 'zod';
import { LIMITS } from './constants.js';
import { FaultScenario } from './faults.js';
import { Insight } from './insight.js';
import {
  ConfidenceLabel,
  CorrelationId,
  EventId,
  FixtureId,
  Locale,
  MetricRef,
  OrgId,
  Persona,
  PlayerId,
  RunId,
  SchemaVersion,
  SemVer,
  TeamId,
  UtcTimestamp,
} from './primitives.js';

export const AgentName = z.enum([
  'MATCH_ANALYST',
  'NARRATIVE_WRITER',
  'FACT_CHECKER',
  'BROADCAST_PRODUCER',
  'LOCALIZATION',
]);

export const ModelProvider = z.enum(['foundry', 'ollama', 'mock', 'template']);

/** Names an agent is allowed to mention; anything else is rejected. */
export const EntityAllowlist = z.strictObject({
  teams: z.array(z.strictObject({ teamId: TeamId, name: z.string() })),
  players: z.array(
    z.strictObject({
      playerId: PlayerId,
      teamId: TeamId,
      displayName: z.string(),
    }),
  ),
});

/** Immutable input shared by every agent in one pipeline run. */
export const FactPacket = z.strictObject({
  schemaVersion: SchemaVersion,
  runId: RunId,
  correlationId: CorrelationId,
  orgId: OrgId,
  fixtureId: FixtureId,
  insight: Insight,
  entities: EntityAllowlist,
  persona: Persona,
  locale: Locale,
  deadlineMs: z.int().positive().max(LIMITS.maxAgentDeadlineMs),
  policyVersion: SemVer,
});

export const CitedValue = z.strictObject({
  metricRef: MetricRef,
  value: z.number(),
});

export const AgentClaim = z.strictObject({
  claimType: z.enum(['OBSERVATION', 'INFERENCE']),
  text: z.string().min(1).max(400),
  evidenceEventIds: z.array(EventId).min(1),
  citedValues: z.array(CitedValue),
});

export const AgentResult = z.strictObject({
  schemaVersion: SchemaVersion,
  runId: RunId,
  agent: AgentName,
  claims: z.array(AgentClaim),
  limitations: z.array(z.string().min(1).max(200)),
  locale: Locale,
  confidenceLabel: ConfidenceLabel,
  traceId: z.string().min(1).max(128),
});

export const VerificationIssueCode = z.enum([
  'UNSUPPORTED_NUMBER',
  'UNKNOWN_ENTITY',
  'UNCITED_EVIDENCE',
  'FORBIDDEN_CLAIM',
  'SCHEMA_VIOLATION',
  'LENGTH_EXCEEDED',
]);

export const VerificationResult = z.strictObject({
  verdict: z.enum(['PASS', 'REVISE', 'REJECT']),
  issues: z.array(
    z.strictObject({
      code: VerificationIssueCode,
      detail: z.string().min(1).max(300),
      claimIndex: z.int().nonnegative().optional(),
    }),
  ),
});

export const AgentRunOutcome = z.enum([
  'SUCCEEDED',
  'FAILED',
  'TIMED_OUT',
  'FALLBACK',
]);

export const AgentRun = z.strictObject({
  runId: RunId,
  correlationId: CorrelationId,
  agent: AgentName,
  provider: ModelProvider,
  modelDeployment: z.string().min(1).max(128).optional(),
  promptVersion: SemVer,
  startedAt: UtcTimestamp,
  latencyMs: z.int().nonnegative(),
  tokensIn: z.int().nonnegative().optional(),
  tokensOut: z.int().nonnegative().optional(),
  retries: z.int().min(0).max(LIMITS.maxAgentRetries),
  outcome: AgentRunOutcome,
  /** Set only on runs of a non-production demo fault plan (ADR-0017); never real inference. */
  faultInjected: FaultScenario.optional(),
  /** What the simulated fault did, or the Fact Checker notes the revision answered. */
  faultNote: z.string().min(1).max(LIMITS.faultNoteMax).optional(),
});

export type AgentName = z.infer<typeof AgentName>;
export type ModelProvider = z.infer<typeof ModelProvider>;
export type EntityAllowlist = z.infer<typeof EntityAllowlist>;
export type FactPacket = z.infer<typeof FactPacket>;
export type CitedValue = z.infer<typeof CitedValue>;
export type AgentClaim = z.infer<typeof AgentClaim>;
export type AgentResult = z.infer<typeof AgentResult>;
export type VerificationIssueCode = z.infer<typeof VerificationIssueCode>;
export type VerificationResult = z.infer<typeof VerificationResult>;
export type AgentRunOutcome = z.infer<typeof AgentRunOutcome>;
export type AgentRun = z.infer<typeof AgentRun>;

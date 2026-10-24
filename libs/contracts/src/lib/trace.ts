import { z } from 'zod';
import { AgentName, ModelProvider } from './agents.js';
import { PATTERNS } from './constants.js';
import { PipelineStatus } from './insight.js';
import {
  CorrelationId,
  EventId,
  FixtureId,
  InsightId,
  MetricRef,
  RunId,
  SemVer,
  UtcTimestamp,
} from './primitives.js';

export const TRACE_LIMITS = {
  /** Analyst, two writer/checker rounds, fallback, localization and producer, with headroom. */
  maxAgentSteps: 32,
  stepEvidenceMax: 64,
  stepReasonMax: 200,
  stepRetriesMax: 64,
} as const;

/** Roster stages plus the deterministic template fallback, which is not a model agent. */
export const AgentStepRole = z
  .enum([...AgentName.options, 'TEMPLATE_FALLBACK'])
  .meta({ id: 'AgentStepRole' });

export const AgentStepDecision = z
  .enum(['PASS', 'REVISE', 'REJECT', 'FALLBACK'])
  .meta({ id: 'AgentStepDecision' });

/**
 * One handoff between roster stages (spec §28, §46). The agents service returns
 * these with each result; the worker stores them unchanged.
 */
export const AgentStep = z
  .strictObject({
    stepIndex: z.int().nonnegative().max(TRACE_LIMITS.maxAgentSteps),
    role: AgentStepRole,
    runId: RunId,
    correlationId: CorrelationId,
    /** Prompt registry version and SHA-256 of the prompt text that ran. */
    agentVersion: z.strictObject({
      promptVersion: SemVer,
      promptHash: z.string().regex(PATTERNS.sha256Hex).optional(),
    }),
    provider: ModelProvider,
    modelDeployment: z.string().min(1).max(128).optional(),
    fromStatus: PipelineStatus,
    toStatus: PipelineStatus,
    decision: AgentStepDecision,
    reasonCode: z.string().regex(PATTERNS.reasonCode),
    reason: z.string().min(1).max(TRACE_LIMITS.stepReasonMax),
    /** SHA-256 of the canonical JSON (sorted keys, no whitespace) the stage received. */
    inputChecksum: z.string().regex(PATTERNS.sha256Hex),
    evidenceEventIds: z.array(EventId).max(TRACE_LIMITS.stepEvidenceMax),
    metricRefs: z.array(MetricRef).max(TRACE_LIMITS.stepEvidenceMax),
    startedAt: UtcTimestamp,
    latencyMs: z.int().nonnegative(),
    tokensIn: z.int().nonnegative().optional(),
    tokensOut: z.int().nonnegative().optional(),
    /** Absent when any model call in the step has no configured price. */
    costEstimateUsd: z.number().nonnegative().optional(),
    retries: z.int().min(0).max(TRACE_LIMITS.stepRetriesMax),
  })
  .meta({ id: 'AgentStep' });

/** Every step of one pipeline run, as `GET /agents/traces/{correlationId}` returns it. */
export const AgentStepTrace = z.strictObject({
  correlationId: CorrelationId,
  runId: RunId,
  fixtureId: FixtureId,
  insightId: InsightId,
  steps: z.array(AgentStep).max(TRACE_LIMITS.maxAgentSteps),
});

export type AgentStepRole = z.infer<typeof AgentStepRole>;
export type AgentStepDecision = z.infer<typeof AgentStepDecision>;
export type AgentStep = z.infer<typeof AgentStep>;
export type AgentStepTrace = z.infer<typeof AgentStepTrace>;

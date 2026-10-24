import { z } from 'zod';
import {
  AgentResult,
  AgentRun,
  CitedValue,
  FactPacket,
  VerificationResult,
} from './agents.js';
import { AnalystBreakdown } from './breakdown.js';
import { LIMITS } from './constants.js';
import { FaultScenario } from './faults.js';
import { PipelineStatus } from './insight.js';
import { NarrativeSource } from './narrative.js';
import { OverlayKind } from './overlay.js';
import {
  CorrelationId,
  EventId,
  Locale,
  MetricRef,
  Persona,
  RunId,
  SchemaVersion,
} from './primitives.js';
import { AgentStep, TRACE_LIMITS } from './trace.js';

/** Worker → agents: one insight, every audience variant requested. */
export const PipelineRequest = z
  .strictObject({
    schemaVersion: SchemaVersion,
    packet: FactPacket,
    personas: z.array(Persona).min(1),
    locales: z.array(Locale).min(1),
    /** Demo fault for this insight (ADR-0020); ignored unless demo faults are enabled. */
    fault: FaultScenario.optional(),
  })
  .meta({ id: 'PipelineRequest' });

/** A proposed narrative; the worker's deterministic gate decides whether it is published. */
export const NarrativeDraft = z
  .strictObject({
    persona: Persona,
    locale: Locale,
    headline: z.string().min(1).max(LIMITS.narrativeHeadlineMax),
    body: z.string().min(1).max(LIMITS.narrativeBodyMax),
    evidenceEventIds: z.array(EventId).min(1),
    citedValues: z.array(CitedValue),
    source: NarrativeSource,
    localeFallback: z.boolean(),
    /** ANALYST only (MQ-068); every part passes the same gate as the body. */
    breakdown: AnalystBreakdown.optional(),
  })
  .meta({ id: 'NarrativeDraft' });

export const OverlayProposal = z
  .strictObject({
    kind: OverlayKind,
    priority: z.int().min(0).max(LIMITS.overlayPriorityMax),
    durationMs: z
      .int()
      .min(LIMITS.overlayMinDisplayMs)
      .max(LIMITS.overlayMaxDisplayMs),
    headline: z.string().min(1).max(LIMITS.overlayHeadlineMax),
    body: z.string().max(LIMITS.overlayBodyMax),
    evidenceEventIds: z.array(EventId).min(1),
    metricRefs: z.array(MetricRef),
  })
  .meta({ id: 'OverlayProposal' });

export const PipelineResult = z
  .strictObject({
    schemaVersion: SchemaVersion,
    runId: RunId,
    correlationId: CorrelationId,
    status: PipelineStatus,
    analysis: AgentResult.nullable(),
    verification: VerificationResult.nullable(),
    narratives: z.array(NarrativeDraft),
    overlay: OverlayProposal.nullable(),
    runs: z.array(AgentRun),
    /** One record per roster handoff; older services omit it. */
    steps: z.array(AgentStep).max(TRACE_LIMITS.maxAgentSteps).default([]),
    /** Present whenever any stage fell back to templates or was suppressed. */
    fallbackReason: z.string().min(1).max(200).optional(),
  })
  .meta({ id: 'PipelineResult' });

export type PipelineRequest = z.infer<typeof PipelineRequest>;
export type NarrativeDraft = z.infer<typeof NarrativeDraft>;
export type OverlayProposal = z.infer<typeof OverlayProposal>;
export type PipelineResult = z.infer<typeof PipelineResult>;

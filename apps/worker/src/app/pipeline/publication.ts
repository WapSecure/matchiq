import type {
  AgentRun,
  Fixture,
  Insight,
  Narrative,
  NarrativeDraft,
  OverlayProposal,
  PipelineResult,
} from '@matchiq/contracts';
import type { GateRejection, GateReport, InsightCompletion } from '@matchiq/db';
import {
  FALLBACK_REASONS,
  INSIGHT_REVISION,
  LOCALES,
  PERSONAS,
  TEMPLATE_PROMPT_VERSION,
} from '../constants';
import {
  allowlistOf,
  correlationIdFor,
  runIdFor,
  toNarrative,
} from './artifacts';
import {
  gateOverlay,
  rejection,
  selectNarratives,
  type GateContext,
} from './gate/publish-gate';
import { templateDraft, templateDrafts } from './templates/template-narratives';

/** Everything one insight's publication writes, decided before any I/O. */
export interface Publication {
  readonly narratives: Narrative[];
  readonly completion: InsightCompletion;
  readonly runs: AgentRun[];
  /** A gated agent overlay to apply as a new cue revision, if any. */
  readonly overlay: OverlayProposal | null;
}

export const gateContextOf = (
  insight: Insight,
  fixture: Fixture,
): GateContext => ({
  insight,
  entities: allowlistOf(fixture),
  personas: PERSONAS,
  locales: LOCALES,
});

export interface TemplateInput {
  readonly insight: Insight;
  readonly fixture: Fixture;
  readonly createdAt: string;
  readonly reason: string;
  readonly retries?: number;
  readonly priorRejections?: readonly GateRejection[];
}

const templateRun = (input: TemplateInput): AgentRun => ({
  runId: runIdFor(
    input.fixture.fixtureId,
    input.insight.insightId,
    INSIGHT_REVISION,
  ),
  correlationId: correlationIdFor(
    input.fixture.fixtureId,
    input.insight.insightId,
    INSIGHT_REVISION,
  ),
  agent: 'NARRATIVE_WRITER',
  provider: 'template',
  promptVersion: TEMPLATE_PROMPT_VERSION,
  startedAt: input.createdAt,
  latencyMs: 0,
  retries: input.retries ?? 0,
  outcome: 'FALLBACK',
});

/** AI disabled or the agents pipeline failed: every variant from deterministic templates. */
export const templatePublication = (input: TemplateInput): Publication => {
  const { insight, fixture } = input;
  const drafts = templateDrafts(insight, fixture, {
    personas: PERSONAS,
    locales: LOCALES,
  });
  const { accepted, rejected } = selectNarratives(
    drafts,
    gateContextOf(insight, fixture),
    'TEMPLATE',
  );
  const gateReport: GateReport = {
    source: 'TEMPLATE',
    publishedNarratives: accepted.length,
    templateNarratives: accepted.length,
    overlayRevision: null,
    rejected: [...(input.priorRejections ?? []), ...rejected],
  };
  return {
    narratives: accepted.map((d) => toNarrative(insight, d, input.createdAt)),
    completion: {
      status: 'FALLBACK',
      gateReport,
      fallbackReason: input.reason,
    },
    runs: [templateRun(input)],
    overlay: null,
  };
};

const variantKey = (d: Pick<NarrativeDraft, 'persona' | 'locale'>) =>
  `${d.persona}/${d.locale}`;

/** Fills variants the agents did not provide (or that failed the gate) from templates. */
const fillMissing = (
  accepted: readonly NarrativeDraft[],
  insight: Insight,
  fixture: Fixture,
): NarrativeDraft[] => {
  const have = new Set(accepted.map(variantKey));
  const missing = PERSONAS.flatMap((persona) =>
    LOCALES.filter((locale) => !have.has(variantKey({ persona, locale }))).map(
      (locale) => templateDraft(insight, fixture, { persona, locale }),
    ),
  );
  return selectNarratives(missing, gateContextOf(insight, fixture), 'TEMPLATE')
    .accepted;
};

/** REJECTED means the agents suppressed every draft; deterministic templates still apply (ADR-0002). */
const fallbackFor = (status: PipelineResult['status']): string =>
  status === 'REJECTED'
    ? FALLBACK_REASONS.agentsRejected
    : FALLBACK_REASONS.gateRejectedAll;

export interface AgentInput {
  readonly insight: Insight;
  readonly fixture: Fixture;
  readonly result: PipelineResult;
  readonly createdAt: string;
}

/**
 * The worker's commit decision for an agents result (ADR-0002): only drafts
 * and the overlay that pass the deterministic gate are published; rejected
 * items are recorded with reasons and their variants fall back to templates.
 */
export const agentPublication = (input: AgentInput): Publication => {
  const { insight, fixture, result } = input;
  const ctx = gateContextOf(insight, fixture);
  const agent = selectNarratives(result.narratives, ctx, 'AGENT');
  const templates = fillMissing(agent.accepted, insight, fixture);
  const overlayVerdict =
    result.overlay === null ? null : gateOverlay(result.overlay, ctx);
  const rejected = [...agent.rejected];
  if (overlayVerdict !== null && !overlayVerdict.ok) {
    rejected.push(rejection('OVERLAY', 'AGENT', overlayVerdict.issues));
  }
  const overlay = overlayVerdict?.ok === true ? overlayVerdict.value : null;
  // A FALLBACK result carries the service's own TEMPLATE drafts: gated, but not model output.
  const usedAgent = agent.accepted.some((d) => d.source === 'AGENT');
  const fallbackReason =
    result.fallbackReason ??
    (usedAgent ? undefined : fallbackFor(result.status));
  const gateReport: GateReport = {
    source: usedAgent ? 'AGENT' : 'TEMPLATE',
    publishedNarratives: agent.accepted.length + templates.length,
    templateNarratives: templates.length,
    overlayRevision: null,
    rejected,
  };
  return {
    narratives: [...agent.accepted, ...templates].map((d) =>
      toNarrative(insight, d, input.createdAt),
    ),
    completion: {
      status: usedAgent ? 'PUBLISHED' : 'FALLBACK',
      gateReport,
      ...(fallbackReason === undefined ? {} : { fallbackReason }),
    },
    runs: [...result.runs],
    overlay,
  };
};

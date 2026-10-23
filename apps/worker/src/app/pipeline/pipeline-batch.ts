import {
  SCHEMA_VERSION,
  type AgentRun,
  type AgentStep,
  type Insight,
  type InsightRetraction,
  type MatchEvent,
  type MatchSnapshot,
  type Narrative,
  type OverlayCue,
  type ReplayStatus,
  type StreamMessageOf,
  type StreamMessageType,
} from '@matchiq/contracts';
import type {
  InsightCompletion,
  InsightRecord,
  OverlayRecord,
  StreamMessageDraft,
} from '@matchiq/db';

export interface OverlayEnd {
  readonly overlayId: string;
  readonly status: OverlayCue['status'];
  readonly reason: string;
  readonly editorial?: OverlayRecord['editorial'];
}

/** Everything one transaction writes; stream drafts keep emission order. */
export interface PipelineBatch {
  readonly events: MatchEvent[];
  readonly drafts: StreamMessageDraft[];
  readonly insights: InsightRecord[];
  readonly narratives: Narrative[];
  readonly overlays: OverlayRecord[];
  readonly overlayEnds: OverlayEnd[];
  /** Insights a correction ruled out; written after the artifacts above. */
  readonly retractions: InsightRetraction[];
  readonly completions: { insightId: string; completion: InsightCompletion }[];
  readonly agentRuns: { insightId: string; runs: AgentRun[] }[];
  readonly agentSteps: { insightId: string; steps: AgentStep[] }[];
  /** Insights this batch publishes only if it moves them out of PENDING. */
  readonly claims: { insightId: string; publication: 'AGENT' | 'TEMPLATE' }[];
  /** In-memory effects applied only after the batch commits. */
  readonly afterCommit: (() => void)[];
  snapshot: MatchSnapshot | null;
  status: ReplayStatus | null;
  matchEnded: boolean;
}

export const emptyBatch = (): PipelineBatch => ({
  events: [],
  drafts: [],
  insights: [],
  narratives: [],
  overlays: [],
  overlayEnds: [],
  retractions: [],
  completions: [],
  agentRuns: [],
  agentSteps: [],
  claims: [],
  afterCommit: [],
  snapshot: null,
  status: null,
  matchEnded: false,
});

export const isEmptyBatch = (batch: PipelineBatch): boolean =>
  batch.drafts.length === 0 && batch.status === null;

/**
 * Builds a stream draft; `appendStreamMessages` re-validates every draft
 * against `StreamMessage` before it is stored. `emittedAt` is wall-clock and
 * excluded from determinism checks.
 */
export const streamDraft = <T extends StreamMessageType>(
  fixtureId: string,
  emittedAt: string,
  type: T,
  payload: StreamMessageOf<T>['payload'],
): StreamMessageDraft =>
  ({
    schemaVersion: SCHEMA_VERSION,
    fixtureId,
    emittedAt,
    type,
    payload,
  }) as StreamMessageDraft;

export interface PublicationWrite {
  readonly fixtureId: string;
  readonly insight: Insight;
  readonly publication: {
    readonly narratives: readonly Narrative[];
    readonly completion: InsightCompletion;
    readonly runs: readonly AgentRun[];
    readonly steps?: readonly AgentStep[];
  };
  readonly now: () => string;
}

/** Narratives, completion and agent runs of one publication, in stream order. */
export const appendPublication = (
  write: PublicationWrite,
  batch: PipelineBatch,
): void => {
  const { fixtureId, insight, publication, now } = write;
  for (const narrative of publication.narratives) {
    batch.drafts.push(
      streamDraft(fixtureId, now(), 'narrative.ready', narrative),
    );
  }
  batch.narratives.push(...publication.narratives);
  batch.completions.push({
    insightId: insight.insightId,
    completion: publication.completion,
  });
  batch.agentRuns.push({
    insightId: insight.insightId,
    runs: [...publication.runs],
  });
  if (publication.steps?.length) {
    batch.agentSteps.push({
      insightId: insight.insightId,
      steps: [...publication.steps],
    });
  }
};

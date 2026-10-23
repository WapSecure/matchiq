import type {
  AgentRun,
  AuditActorType,
  CreatedSession,
  CursorPage,
  CursorPageQuery,
  FaultPlan,
  Fixture,
  FixtureTemplateSummary,
  GateReport,
  Insight,
  InsightPublication,
  InsightTrace,
  Locale,
  MatchEvent,
  MatchSnapshot,
  Narrative,
  OverlayCue,
  OverlayEditorialState,
  Persona,
  RecapDocument,
  ReplaySessionView,
  ReplayStatus,
} from '@matchiq/contracts';
import type { EditorialView } from './editorial-types.js';
import type { SessionActivity, SessionCapacity } from './operations-types.js';
import type { FixtureKey, LedgerTransaction } from './ports.js';

/**
 * Wire types are owned by `libs/contracts` (ADR-0017); they are re-exported
 * here so ports and adapters keep one import site.
 */
export type {
  CreatedSession,
  FixtureTemplateSummary,
  GateIssueCode,
  GateRejection,
  GateReport,
  InsightEditorialTrace,
  InsightPublication,
  InsightTrace,
  RecapDocument,
  RecapMoment,
  RecapNarrative,
  ReplaySessionView,
  TeamSummary,
} from '@matchiq/contracts';

export interface FixtureTemplate extends FixtureTemplateSummary {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
}

export type TemplateUpsertOutcome = 'inserted' | 'updated' | 'unchanged';

export interface InsightRecord {
  readonly insight: Insight;
  readonly revision: number;
  readonly period: number;
  readonly detectedSequence: number;
  readonly publication: InsightPublication;
}

export interface OverlayEndWrite {
  readonly status: OverlayCue['status'];
  readonly reason: string;
  /** Set when a cue that never aired closes under review (ADR-0023). */
  readonly editorial?: OverlayRecord['editorial'];
}

export interface OverlayRecord {
  readonly cue: OverlayCue;
  /** Lifecycle status stored for reads; the published cue keeps its approval status. */
  readonly status: OverlayCue['status'];
  readonly period: number;
  readonly publishedSequence: number;
  /** Set when editorial policy keeps the cue off air. */
  readonly editorial?: {
    readonly state: OverlayEditorialState;
    readonly reason: string;
  };
}

export interface InsightWithPeriod {
  readonly insight: Insight;
  readonly period: number;
}

export interface InsightCompletion {
  readonly status: Insight['status'];
  readonly gateReport: GateReport;
  readonly fallbackReason?: string;
}

export type SessionProgress = Pick<
  ReplayStatus,
  'appliedSequence' | 'period' | 'matchClockMs'
>;

export interface NarrativeFilter {
  readonly persona?: Persona;
  readonly locale?: Locale;
}

/** Writes owned by the worker's pipeline; one transaction per batch. */
export interface PipelineTransaction extends LedgerTransaction {
  /** Highest stored event sequence, or -1 for an empty ledger. */
  ledgerHead(key: FixtureKey): Promise<number>;
  insertInsights(
    key: FixtureKey,
    rows: readonly InsightRecord[],
  ): Promise<void>;
  /** Editorial state for the overlays and insights a batch touches. */
  editorialView(
    key: FixtureKey,
    overlayIds: readonly string[],
    insightIds: readonly string[],
  ): Promise<EditorialView>;
  /** True only for the caller that moves an unsuppressed insight out of PENDING. */
  claimPublication(
    key: FixtureKey,
    insightId: string,
    publication: Exclude<InsightPublication, 'PENDING'>,
  ): Promise<boolean>;
  completeInsight(
    key: FixtureKey,
    insightId: string,
    completion: InsightCompletion,
  ): Promise<void>;
  insertNarratives(
    key: FixtureKey,
    narratives: readonly Narrative[],
  ): Promise<void>;
  upsertOverlay(key: FixtureKey, record: OverlayRecord): Promise<void>;
  endOverlay(
    key: FixtureKey,
    overlayId: string,
    end: OverlayEndWrite,
  ): Promise<void>;
  insertAgentRuns(
    key: FixtureKey,
    insightId: string,
    runs: readonly AgentRun[],
  ): Promise<void>;
  saveSnapshot(key: FixtureKey, snapshot: MatchSnapshot): Promise<void>;
  updateSession(key: FixtureKey, status: ReplayStatus): Promise<void>;
  /** Moves the session's applied position without touching state or speed. */
  updateSessionProgress(
    key: FixtureKey,
    progress: SessionProgress,
  ): Promise<void>;
  saveRecap(key: FixtureKey, recap: RecapDocument): Promise<void>;
}

export interface PipelineUnitOfWork {
  transaction<T>(work: (tx: PipelineTransaction) => Promise<T>): Promise<T>;
}

export interface TemplateInput {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
  readonly eventsHash: string;
  readonly finalScore: { readonly home: number; readonly away: number };
}

export interface TemplateStore {
  upsert(orgId: string, input: TemplateInput): Promise<TemplateUpsertOutcome>;
  get(orgId: string, templateId: string): Promise<FixtureTemplate | null>;
  list(orgId: string): Promise<FixtureTemplateSummary[]>;
  page(
    orgId: string,
    query: CursorPageQuery,
  ): Promise<CursorPage<FixtureTemplateSummary>>;
}

export interface CreateSessionCommand {
  readonly orgId: string;
  /** The caller recorded in the audit row; defaults to the anonymous viewer. */
  readonly actor?: {
    readonly id: string;
    readonly type: AuditActorType;
    readonly displayName?: string;
    readonly details: Record<string, unknown>;
  };
  readonly templateId: string;
  readonly speed: ReplayStatus['speed'];
  readonly faultPlan?: FaultPlan;
  /** When set, creation fails with `SessionCapacityExceeded` at the limit. */
  readonly capacity?: SessionCapacity;
}

export interface SessionStore extends SessionActivity {
  /** Null when the template does not exist. */
  create(command: CreateSessionCommand): Promise<CreatedSession | null>;
  get(key: FixtureKey): Promise<ReplaySessionView | null>;
  page(
    orgId: string,
    query: CursorPageQuery,
  ): Promise<CursorPage<ReplaySessionView>>;
}

export interface IntelligenceReader {
  latestSnapshot(key: FixtureKey): Promise<MatchSnapshot | null>;
  insights(key: FixtureKey): Promise<Insight[]>;
  insightsWithPeriod(key: FixtureKey): Promise<InsightWithPeriod[]>;
  /** The insight while its narratives are still unpublished, else null. */
  pendingInsight(key: FixtureKey, insightId: string): Promise<Insight | null>;
  narratives(key: FixtureKey, filter: NarrativeFilter): Promise<Narrative[]>;
  overlays(key: FixtureKey): Promise<OverlayCue[]>;
  recap(key: FixtureKey): Promise<RecapDocument | null>;
  traces(key: FixtureKey): Promise<InsightTrace[]>;
  /** Detection order, `(detectedSequence, insightId)`. */
  insightPage(
    key: FixtureKey,
    query: CursorPageQuery,
  ): Promise<CursorPage<Insight>>;
  /** Insight order, then `(persona, locale, narrativeId)`. */
  narrativePage(
    key: FixtureKey,
    filter: NarrativeFilter,
    query: CursorPageQuery,
  ): Promise<CursorPage<Narrative>>;
  /** On-air cues in publication order, `(publishedSequence, overlayId)`. */
  overlayPage(
    key: FixtureKey,
    query: CursorPageQuery,
  ): Promise<CursorPage<OverlayCue>>;
  /** One trace per insight, in detection order. */
  tracePage(
    key: FixtureKey,
    query: CursorPageQuery,
  ): Promise<CursorPage<InsightTrace>>;
}

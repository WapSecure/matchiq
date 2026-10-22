import type {
  AgentRun,
  ConfidenceLabel,
  Fixture,
  Insight,
  InsightKind,
  InsightPriority,
  Locale,
  MatchEvent,
  MatchSnapshot,
  Narrative,
  NarrativeSource,
  OverlayCue,
  Persona,
  ReplayStatus,
  Team,
  VerificationIssueCode,
} from '@matchiq/contracts';
import type {
  EditorialView,
  InsightEditorialState,
  OverlayEditorialState,
} from './editorial-types.js';
import type { FixtureKey, LedgerTransaction } from './ports.js';

/**
 * Types shared by the API and the worker that have no contract yet. Each is
 * proposed to the platform lead for `libs/contracts` (see ADR-0013).
 */

export type GateIssueCode = VerificationIssueCode | 'UNREQUESTED_VARIANT';

export interface GateRejection {
  readonly item: 'NARRATIVE' | 'OVERLAY';
  readonly source: NarrativeSource;
  readonly persona?: Persona;
  readonly locale?: Locale;
  readonly codes: readonly GateIssueCode[];
  readonly details: readonly string[];
}

export interface GateReport {
  readonly source: NarrativeSource;
  readonly publishedNarratives: number;
  readonly templateNarratives: number;
  readonly overlayRevision: number | null;
  readonly rejected: readonly GateRejection[];
}

export type InsightPublication = 'PENDING' | 'AGENT' | 'TEMPLATE';

export interface TeamSummary {
  readonly teamId: string;
  readonly name: string;
  readonly shortName: string;
  readonly colors: Team['colors'];
}

export interface FixtureTemplateSummary {
  readonly templateId: string;
  readonly title: string;
  readonly competitionLabel: string;
  readonly scenario: string;
  readonly seed: number;
  readonly eventCount: number;
  readonly eventsHash: string;
  readonly finalScore: { readonly home: number; readonly away: number };
  readonly home: TeamSummary;
  readonly away: TeamSummary;
}

export interface FixtureTemplate extends FixtureTemplateSummary {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
}

export type TemplateUpsertOutcome = 'inserted' | 'updated' | 'unchanged';

export interface ReplaySessionView {
  readonly sessionId: string;
  readonly templateId: string;
  readonly sessionNumber: number;
  readonly title: string;
  readonly status: ReplayStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatedSession {
  readonly fixture: Fixture;
  readonly session: ReplaySessionView;
}

export interface RecapNarrative {
  readonly persona: Persona;
  readonly locale: Locale;
  readonly headline: string;
  readonly body: string;
  readonly source: NarrativeSource;
  readonly citations: readonly string[];
}

export interface RecapMoment {
  readonly insightId: string;
  readonly kind: InsightKind;
  readonly priority: InsightPriority;
  readonly period: number;
  readonly matchClockMs: number;
  readonly teamId?: string;
  readonly playerId?: string;
  readonly reasonCode: string;
  readonly confidenceLabel: ConfidenceLabel;
  readonly evidenceEventIds: readonly string[];
  readonly metricRefs: readonly string[];
  readonly narratives: readonly RecapNarrative[];
}

export interface RecapDocument {
  readonly schemaVersion: 1;
  readonly fixtureId: string;
  readonly title: string;
  readonly finalSnapshot: MatchSnapshot;
  readonly keyMoments: readonly RecapMoment[];
  readonly synthetic: true;
}

export interface InsightTrace {
  readonly insightId: string;
  readonly kind: InsightKind;
  readonly matchClockMs: number;
  readonly status: Insight['status'];
  readonly publication: InsightPublication;
  readonly fallbackReason: string | null;
  readonly gate: GateReport | null;
  readonly runs: readonly AgentRun[];
  /** Producer and policy decisions, for the observatory. */
  readonly editorial: InsightEditorialTrace;
}

export interface InsightEditorialTrace {
  readonly insight: InsightEditorialState | null;
  readonly insightReason: string | null;
  readonly overlay: OverlayEditorialState | null;
  readonly overlayReason: string | null;
}

export interface InsightRecord {
  readonly insight: Insight;
  readonly revision: number;
  readonly period: number;
  readonly detectedSequence: number;
  readonly publication: InsightPublication;
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
    end: { status: OverlayCue['status']; reason: string },
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
}

export interface CreateSessionCommand {
  readonly orgId: string;
  readonly templateId: string;
  readonly speed: ReplayStatus['speed'];
}

export interface SessionStore {
  /** Null when the template does not exist. */
  create(command: CreateSessionCommand): Promise<CreatedSession | null>;
  get(key: FixtureKey): Promise<ReplaySessionView | null>;
  list(orgId: string, limit: number): Promise<ReplaySessionView[]>;
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
}

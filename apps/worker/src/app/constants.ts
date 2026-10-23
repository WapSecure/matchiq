import type {
  InsightKind,
  InsightPriority,
  Locale,
  MatchEventType,
  OverlayKind,
  Persona,
  SafeArea,
} from '@matchiq/contracts';

export const SERVICE_NAME = 'matchiq-worker';

/** Bump when gate rules, templates or overlay policy change (sent as `policyVersion`). */
export const PUBLISH_POLICY_VERSION = '1.1.0';
export const TEMPLATE_PROMPT_VERSION = '1.1.0';
export const INSIGHT_REVISION = 1;

export const PERSONAS: readonly Persona[] = ['CASUAL', 'ANALYST', 'BROADCAST'];
export const LOCALES: readonly Locale[] = ['en-GB', 'fr-FR', 'es-ES', 'pcm-NG'];
export const PRIMARY_LOCALE: Locale = 'en-GB';
export const OVERLAY_PERSONA: Persona = 'BROADCAST';

/**
 * Snapshot cadence, all on the match clock so 1x and 30x emit identical
 * streams: always on state-changing events, otherwise at most every
 * `maxEvents` events or `maxClockMs` of play, whichever comes first.
 */
export const SNAPSHOT_CADENCE = {
  maxEvents: 10,
  maxClockMs: 15_000,
  alwaysOn: [
    'MATCH_STARTED',
    'PERIOD_STARTED',
    'PERIOD_ENDED',
    'MATCH_ENDED',
    'GOAL',
    'CARD',
    'SUBSTITUTION',
    'CORRECTION',
  ] satisfies readonly MatchEventType[],
} as const;

/** Spec §26/§44 overlay timing, in match-clock milliseconds. */
export const OVERLAY_TIMING = {
  maxDisplayMs: 12_000,
  minDwellMs: 3_000,
  /** A queued cue older than this is dropped as stale rather than shown late. */
  maxQueueWaitMs: 20_000,
  maxQueueLength: 4,
  durationByKind: {
    SCORE_UPDATE: 10_000,
    DISCIPLINE: 8_000,
    KEY_MOMENT: 7_000,
    TACTICAL_INSIGHT: 7_000,
    STAT_COMPARISON: 6_000,
    SUBSTITUTION: 6_000,
  } satisfies Record<OverlayKind, number>,
} as const;

/** Spec §44: score corrections > editorial cue > contextual stat. */
export const OVERLAY_PRIORITY: Readonly<Record<InsightPriority, number>> = {
  P0: 90,
  P1: 70,
  P2: 50,
};

export const OVERLAY_KIND_BY_INSIGHT: Readonly<
  Record<InsightKind, OverlayKind>
> = {
  GOAL: 'SCORE_UPDATE',
  RED_CARD: 'DISCIPLINE',
  SHOT_BURST: 'KEY_MOMENT',
  HIGH_REGAINS: 'TACTICAL_INSIGHT',
  PRESSURE_SWING: 'TACTICAL_INSIGHT',
  MOMENTUM_SHIFT: 'TACTICAL_INSIGHT',
  PLAYER_MILESTONE: 'STAT_COMPARISON',
};

/** Spec §26 example safe area for a 16:9 broadcast frame. */
export const DEFAULT_SAFE_AREA: SafeArea = {
  topPct: 8,
  rightPct: 6,
  bottomPct: 10,
  leftPct: 6,
};

export const OVERLAY_END_REASONS = {
  expired: 'expired',
  superseded: 'superseded by a higher-priority cue',
  periodEnded: 'period ended',
  matchEnded: 'match ended',
  stale: 'stale: not shown before the queue wait limit',
  queueFull: 'dropped: overlay queue full',
} as const;

export const GATE_DETAILS = {
  schema: (path: string, message: string) => `${path}: ${message}`,
  citedValue: (ref: string, reason: string) => `${ref}: ${reason}`,
  textNumber: (value: string) => `number ${value} is not a cited value`,
  evidence: (ids: string) => `event ids not in the evidence envelope: ${ids}`,
  noEnvelopeEvidence: 'cites no triggering event from the envelope',
  entity: (name: string) => `"${name}" is not in the entity allowlist`,
  length: (field: string, max: number) => `${field} exceeds ${max} characters`,
  sentences: (max: number) => `body has more than ${max} sentence(s)`,
  unrequested: (persona: string, locale: string) =>
    `${persona}/${locale} was not requested`,
  duplicate: (persona: string, locale: string) =>
    `${persona}/${locale} was proposed more than once`,
  metricRef: (ref: string) => `metricRef ${ref} is not in the envelope`,
  guard: (reason: string, excerpt: string | null) =>
    excerpt === null ? reason : `${reason}: "${excerpt}"`,
} as const;

/** Demo fault scenarios (ADR-0020); a metric the engine never computes. */
export const DEMO_FAULTS = {
  injectedCitation: { metricRef: 'fault.injected', value: 99 },
  gateNote: (persona: string, locale: string) =>
    `Simulated failure (demo): the ${persona} ${locale} draft was altered to cite fault.injected = 99 before the publish gate`,
} as const;

export const FALLBACK_REASONS = {
  aiDisabled: 'AI_ENABLED=false: deterministic templates only',
  circuitOpen: 'agents circuit breaker open',
  timeout: 'agents service timed out',
  unreachable: 'agents service unreachable',
  invalidResponse: 'agents service returned an invalid PipelineResult',
  httpStatus: (status: number) => `agents service answered HTTP ${status}`,
  enqueueFailed: 'could not enqueue the agents pipeline job',
  gateRejectedAll: 'every agent draft failed the publish gate',
  agentsRejected: 'agents pipeline rejected the insight; templates published',
} as const;

export const ID_PREFIXES = {
  narrative: 'nr_',
  overlay: 'ov_',
  run: 'run_',
} as const;
export const ID_HASH_LENGTH = 24;
export const ID_PARTS_SEPARATOR = '|';

export const AGENTS_HTTP = {
  pipelinePath: '/api/v1/pipeline/runs',
  livenessPath: '/api/v1/health/live',
  bearerPrefix: 'Bearer ',
  contentType: 'application/json',
  probeTimeoutMs: 1_500,
  /** The service answers within `deadlineMs` (its model work stops early); this covers transport. */
  deadlineGraceMs: 1_500,
  spanName: 'agents.pipeline',
  correlationAttribute: 'matchiq.correlation_id',
} as const;

export const REPLAY_RUNTIME = {
  /** Events written per transaction; bounds lock time at 30x. */
  maxBatchEvents: 100,
  writeRetries: 5,
  writeRetryDelayMs: 200,
  /** How long a completed session stays in memory for late agent overlays. */
  completedRetentionMs: 60_000,
} as const;

export const HEALTH_CHECKS = {
  postgres: 'postgres',
  redis: 'redis',
  agents: 'agents-service',
} as const;

export const HEALTH_DETAILS = {
  unreachable: 'unreachable',
  aiDisabled: 'AI_ENABLED=false; templates only',
  agentsDegraded: 'unreachable; template fallback active',
} as const;

export const LOG_MESSAGES = {
  sessionFailed: (fixtureId: string, reason: string) =>
    `Replay session ${fixtureId} stopped: ${reason}`,
  commandRejected: (fixtureId: string, reason: string) =>
    `Replay command for ${fixtureId} rejected: ${reason}`,
  unknownSession: (fixtureId: string) =>
    `Replay command for unknown session ${fixtureId}`,
  jobFailed: (id: string, reason: string) =>
    `Pipeline job ${id} failed: ${reason}`,
  seekBackwards: (sequence: number, next: number) =>
    `seek to ${sequence} is behind the next sequence ${next}`,
  resumeFailed: (reason: string) =>
    `Could not resume replay sessions: ${reason}`,
  hookFailed: (fixtureId: string, reason: string) =>
    `Post-commit step for ${fixtureId} failed: ${reason}`,
  resumed: (fixtureId: string, sequence: number) =>
    `Resumed replay session ${fixtureId} after sequence ${sequence}`,
} as const;

export const REDIS_CONNECTION_NAMES = {
  publisher: 'matchiq-worker-pub',
  subscriber: 'matchiq-worker-sub',
  queues: 'matchiq-worker-queues',
} as const;

/** Reasons the editorial policy records when it keeps a cue off air (ADR-0016). */
export const EDITORIAL_REASONS = {
  FROZEN: 'EDITORIAL_FREEZE',
  KILLED: 'KILL_SWITCH',
  suppressed: 'INSIGHT_SUPPRESSED',
  offAir: 'CUE_OFF_AIR',
  awaitingApproval: 'AWAITING_APPROVAL',
  approved: 'APPROVED_COPY_LOCKED',
  manualRevision: 'MANUAL_REVISION_WITHHELD',
} as const;

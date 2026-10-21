import type {
  CounterEvidence,
  InsightKind,
  InsightPriority,
  MatchEvent,
  MatchEventType,
} from '@matchiq/contracts';
import type { MetricRecord } from '../metrics/window-metrics.js';
import type { ClockWindow } from '../metrics/windows.js';
import type { DerivedState, FixtureContext, Side } from '../types.js';

export interface RecentEvent {
  readonly type: MatchEventType;
  readonly period: number;
  readonly clockMs: number;
}

/** Everything a rule may read when evaluated after `event` has been folded. */
export interface RuleInput {
  readonly event: MatchEvent;
  readonly derived: DerivedState;
  readonly context: FixtureContext;
  readonly window: ClockWindow;
  readonly previous: ClockWindow | null;
  /** `.rolling5m` (and `.previous5m` when `previous` exists) for both sides. */
  readonly metrics: MetricRecord;
}

/** Observed facts (a goal, a card) or window heuristics (bursts, swings). */
export type Evidence = 'observed' | 'heuristic';

export interface Candidate {
  readonly kind: InsightKind;
  readonly priority: InsightPriority;
  readonly side: Side;
  readonly playerId?: string;
  readonly reasonCode: string;
  readonly evidence: Evidence;
  readonly eventIds: readonly string[];
  /** Defaults to the start of the current window; swing rules span the previous one too. */
  readonly windowStartMs?: number;
  readonly computedMetrics: MetricRecord;
  /** Events of the tracked kinds (both sides) in the window; drives confidence. */
  readonly sampleSize: number;
  readonly rationale: string;
  readonly counterEvidence: readonly CounterEvidence[];
  /** Rules that describe a sustained pattern are debounced per kind and side. */
  readonly debounced: boolean;
}

export type Rule = (input: RuleInput) => readonly Candidate[];

export interface FireMark {
  readonly period: number;
  readonly clockMs: number;
}

/** Resumable detector state: feed countable events in sequence order. */
export interface MomentCursor {
  readonly derived: DerivedState;
  readonly lastFired: Readonly<Record<string, FireMark>>;
  /** Countable events inside the current rolling window, for `dataCoverage`. */
  readonly recent: readonly RecentEvent[];
}

import type { Insight, MatchEvent } from '@matchiq/contracts';
import { WINDOW_SUFFIX, WINDOWS } from '../constants.js';
import { windowMetrics } from '../metrics/window-metrics.js';
import {
  inWindow,
  previousWindow,
  rollingWindow,
  type ClockWindow,
} from '../metrics/windows.js';
import { foldEvent } from '../projection/fold.js';
import { INITIAL_DERIVED } from '../projection/initial-state.js';
import { countableEvents } from '../projection/projector.js';
import type { FixtureContext, ProjectionState } from '../types.js';
import { goalRule, redCardRule } from './event-rules.js';
import { toInsight } from './insight-builder.js';
import { momentumShiftRule, pressureSwingRule } from './swing-rules.js';
import { milestoneRules } from './milestone-rules.js';
import { highRegainsRule, shotBurstRule } from './threshold-rules.js';
import type {
  Candidate,
  FireMark,
  MomentCursor,
  Rule,
  RuleInput,
} from './types.js';

/** Evaluation order is part of the deterministic output order within one event. */
const RULES: readonly Rule[] = [
  goalRule,
  redCardRule,
  shotBurstRule,
  highRegainsRule,
  pressureSwingRule,
  momentumShiftRule,
  ...milestoneRules,
];

export const createMomentCursor = (): MomentCursor => ({
  derived: INITIAL_DERIVED,
  lastFired: {},
  recent: [],
});

const debounceKey = (candidate: Candidate): string =>
  `${candidate.kind}:${candidate.side}`;

const suppressed = (mark: FireMark | undefined, window: ClockWindow): boolean =>
  mark !== undefined &&
  mark.period === window.period &&
  window.endMs - mark.clockMs < WINDOWS.debounceMs;

const buildInput = (
  cursor: MomentCursor,
  event: MatchEvent,
  context: FixtureContext,
): RuleInput => {
  const derived = foldEvent(cursor.derived, event, context);
  const window = rollingWindow(
    event.period,
    derived.clockMs,
    derived.periodStartClockMs,
  );
  const previous = previousWindow(window);
  const metrics = {
    ...windowMetrics(derived.timelines, window),
    ...(previous === null
      ? {}
      : windowMetrics(derived.timelines, previous, WINDOW_SUFFIX.previous)),
  };
  return { event, derived, context, window, previous, metrics };
};

/**
 * Advances the detector by one countable event (sequence order) and returns
 * the insights it triggers. Sustained-pattern rules are debounced per kind and
 * side for `WINDOWS.debounceMs` within a period. CORRECTIONs are ignored here:
 * after a correction or a late event, call `redetectMoments` on the projection.
 */
export const stepMoments = (
  cursor: MomentCursor,
  event: MatchEvent,
  context: FixtureContext,
): { cursor: MomentCursor; insights: Insight[] } => {
  if (event.type === 'CORRECTION') return { cursor, insights: [] };
  const input = buildInput(cursor, event, context);
  const recent = [
    ...cursor.recent,
    { type: event.type, period: event.period, clockMs: event.matchClockMs },
  ].filter((e) => inWindow(input.window, e.period, e.clockMs));

  const lastFired: Record<string, FireMark> = { ...cursor.lastFired };
  const accepted: Candidate[] = [];
  for (const candidate of RULES.flatMap((rule) => rule(input))) {
    const key = debounceKey(candidate);
    if (candidate.debounced && suppressed(lastFired[key], input.window)) {
      continue;
    }
    if (candidate.debounced) {
      lastFired[key] = { period: event.period, clockMs: input.window.endMs };
    }
    accepted.push(candidate);
  }
  return {
    cursor: { derived: input.derived, lastFired, recent },
    insights: accepted.map((c) => toInsight(c, input, recent)),
  };
};

/**
 * Re-scans the projection's current ledger from the start and returns every
 * key moment plus the cursor positioned after the last countable event, so
 * in-order detection can continue from a corrected or reordered ledger.
 */
export const redetectMoments = (
  state: ProjectionState,
): { cursor: MomentCursor; insights: Insight[] } => {
  let cursor = createMomentCursor();
  const insights: Insight[] = [];
  for (const event of countableEvents(state)) {
    const step = stepMoments(cursor, event, state.fixture);
    cursor = step.cursor;
    insights.push(...step.insights);
  }
  return { cursor, insights };
};

/**
 * All key moments for the projection's current ledger (voided events
 * excluded), in sequence order then rule order. Deterministic: the same
 * ledger always yields the same insights, ids and evidence.
 */
export const detectKeyMoments = (state: ProjectionState): Insight[] =>
  redetectMoments(state).insights;

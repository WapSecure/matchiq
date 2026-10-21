import {
  MOMENT_THRESHOLDS,
  REASON_CODES,
  WINDOW_SUFFIX,
} from '../constants.js';
import { windowRef, type WindowSuffix } from '../metrics/registry.js';
import { windowStartMs } from '../metrics/windows.js';
import { opponentOf } from '../projection/initial-state.js';
import { SIDES, type Side, type TrackedKind } from '../types.js';
import { COUNTER, RATIONALE } from './copy.js';
import {
  idsOf,
  opponentCounter,
  sampleSize,
  teamName,
  windowEntries,
} from './rule-helpers.js';
import type { Candidate, Rule, RuleInput } from './types.js';

interface Comparison {
  readonly now: number;
  readonly before: number;
  readonly opponentNow: number;
  readonly opponentBefore: number;
}

/** Current and previous-window values of `base` for a side and its opponent, if all exist. */
const compare = (
  input: RuleInput,
  base: string,
  side: Side,
): Comparison | null => {
  const read = (s: Side, suffix: WindowSuffix) =>
    input.metrics[windowRef(base, s, suffix)];
  const opponent = opponentOf(side);
  const now = read(side, WINDOW_SUFFIX.current);
  const before = read(side, WINDOW_SUFFIX.previous);
  const opponentNow = read(opponent, WINDOW_SUFFIX.current);
  const opponentBefore = read(opponent, WINDOW_SUFFIX.previous);
  if (
    now === undefined ||
    before === undefined ||
    opponentNow === undefined ||
    opponentBefore === undefined
  ) {
    return null;
  }
  return { now, before, opponentNow, opponentBefore };
};

const swingCandidate = (
  input: RuleInput,
  side: Side,
  fields: Pick<Candidate, 'kind' | 'reasonCode' | 'eventIds' | 'rationale'>,
): Candidate => ({
  ...fields,
  priority: 'P1',
  side,
  evidence: 'heuristic',
  ...(input.previous === null
    ? {}
    : { windowStartMs: windowStartMs(input.previous) }),
  computedMetrics: input.metrics,
  sampleSize: sampleSize(input),
  counterEvidence: opponentCounter(input, side, 'shots', COUNTER.opponentShots),
  debounced: true,
});

/**
 * Pressure swing: the team's pressures in the current window exceed the
 * previous comparable window by at least `pressureSwingMinDelta`, reach
 * `pressureSwingMinCount`, and exceed the opponent's current pressures.
 */
export const pressureSwingRule: Rule = (input) =>
  SIDES.flatMap((side) => {
    const c = compare(input, 'pressures', side);
    const t = MOMENT_THRESHOLDS;
    if (c === null || c.now < t.pressureSwingMinCount) return [];
    if (c.now - c.before < t.pressureSwingMinDelta || c.now <= c.opponentNow) {
      return [];
    }
    return [
      swingCandidate(input, side, {
        kind: 'PRESSURE_SWING',
        reasonCode: REASON_CODES.pressureSwing,
        eventIds: idsOf(windowEntries(input, side, 'pressures')),
        rationale: RATIONALE.pressureSwing(
          teamName(input, side),
          c.now,
          c.before,
        ),
      }),
    ];
  });

const MOMENTUM_KINDS: readonly TrackedKind[] = [
  'shots',
  'finalThirdEntries',
  'pressures',
  'highRecoveries',
];

/**
 * Momentum shift on the differential D = M(team) - M(opponent): fires when
 * D now >= `momentumShiftMinLead` and D rose by >= `momentumShiftMinDelta`
 * versus the previous comparable window.
 */
export const momentumShiftRule: Rule = (input) =>
  SIDES.flatMap((side) => {
    const c = compare(input, 'momentum', side);
    if (c === null) return [];
    const lead = c.now - c.opponentNow;
    const rise = lead - (c.before - c.opponentBefore);
    const t = MOMENT_THRESHOLDS;
    if (lead < t.momentumShiftMinLead || rise < t.momentumShiftMinDelta) {
      return [];
    }
    const eventIds = MOMENTUM_KINDS.flatMap((kind) =>
      idsOf(windowEntries(input, side, kind)),
    );
    if (eventIds.length === 0) return [];
    return [
      swingCandidate(input, side, {
        kind: 'MOMENTUM_SHIFT',
        reasonCode: REASON_CODES.momentumShift,
        eventIds: [...new Set(eventIds)],
        rationale: RATIONALE.momentumShift(teamName(input, side), c),
      }),
    ];
  });

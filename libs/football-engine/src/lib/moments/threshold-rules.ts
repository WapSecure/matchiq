import type { InsightKind, MatchEventType } from '@matchiq/contracts';
import { MOMENT_THRESHOLDS, REASON_CODES } from '../constants.js';
import { sideOf } from '../projection/initial-state.js';
import type { TrackedKind } from '../types.js';
import { COUNTER, RATIONALE } from './copy.js';
import {
  idsOf,
  opponentCounter,
  sampleSize,
  teamName,
  windowEntries,
} from './rule-helpers.js';
import type { Rule } from './types.js';

interface ThresholdSpec {
  readonly kind: InsightKind;
  readonly trigger: MatchEventType;
  readonly timeline: TrackedKind;
  readonly min: number;
  readonly reasonCode: string;
  readonly rationale: (team: string, count: number) => string;
  readonly counterKind: TrackedKind;
  readonly counter: (team: string, count: number) => string;
}

/**
 * Fires when the triggering event itself is on `timeline` and brings the
 * team's count in the current window to at least `min`.
 */
const thresholdRule =
  (spec: ThresholdSpec): Rule =>
  (input) => {
    const { event } = input;
    if (event.type !== spec.trigger || !('teamId' in event)) return [];
    const side = sideOf(input.context, event.teamId);
    if (side === null) return [];
    const entries = windowEntries(input, side, spec.timeline);
    const triggered = entries.some((e) => e.eventId === event.eventId);
    if (!triggered || entries.length < spec.min) return [];
    return [
      {
        kind: spec.kind,
        priority: 'P1',
        side,
        reasonCode: spec.reasonCode,
        evidence: 'heuristic',
        eventIds: idsOf(entries),
        computedMetrics: input.metrics,
        sampleSize: sampleSize(input),
        rationale: spec.rationale(teamName(input, side), entries.length),
        counterEvidence: opponentCounter(
          input,
          side,
          spec.counterKind,
          spec.counter,
        ),
        debounced: true,
      },
    ];
  };

export const shotBurstRule = thresholdRule({
  kind: 'SHOT_BURST',
  trigger: 'SHOT',
  timeline: 'shots',
  min: MOMENT_THRESHOLDS.shotBurstMinShots,
  reasonCode: REASON_CODES.shotBurst,
  rationale: RATIONALE.shotBurst,
  counterKind: 'shots',
  counter: COUNTER.opponentShots,
});

export const highRegainsRule = thresholdRule({
  kind: 'HIGH_REGAINS',
  trigger: 'RECOVERY',
  timeline: 'highRecoveries',
  min: MOMENT_THRESHOLDS.highRegainsMinRecoveries,
  reasonCode: REASON_CODES.highRegains,
  rationale: RATIONALE.highRegains,
  counterKind: 'highRecoveries',
  counter: COUNTER.opponentHighRegains,
});

import {
  SCHEMA_VERSION,
  type ConfidenceLabel,
  type Insight,
} from '@matchiq/contracts';
import {
  CONFIDENCE_RULES,
  COVERAGE_EVENT_TYPES,
  INSIGHT_ID_HASH_LENGTH,
  INSIGHT_ID_PREFIX,
  MOMENT_METHOD_VERSION,
  ROUNDING,
} from '../constants.js';
import { windowStartMs } from '../metrics/windows.js';
import { sha256Hex } from '../util/canonical-json.js';
import { roundTo } from '../util/numbers.js';
import type { Candidate, RecentEvent, RuleInput } from './types.js';

/** Stable across replays and re-scans: depends only on fixture, kind, side and anchor event. */
export const insightIdFor = (
  fixtureId: string,
  candidate: Pick<Candidate, 'kind' | 'side'>,
  anchorEventId: string,
): string =>
  `${INSIGHT_ID_PREFIX}${sha256Hex(
    [fixtureId, candidate.kind, candidate.side, anchorEventId].join('|'),
  ).slice(0, INSIGHT_ID_HASH_LENGTH)}`;

/** Fraction of `COVERAGE_EVENT_TYPES` seen in the window, 0..1. */
export const dataCoverage = (recent: readonly RecentEvent[]): number => {
  const present = new Set(recent.map((e) => e.type));
  const seen = COVERAGE_EVENT_TYPES.filter((t) => present.has(t)).length;
  return roundTo(seen / COVERAGE_EVENT_TYPES.length, ROUNDING.coverageDecimals);
};

/**
 * Observed single facts (goal, dismissal) are `high`. Heuristic patterns are
 * graded by window coverage and sample size, never by a modelled probability.
 */
export const confidenceFor = (
  candidate: Pick<Candidate, 'evidence' | 'sampleSize'>,
  coverage: number,
): ConfidenceLabel => {
  if (candidate.evidence === 'observed') return 'high';
  const r = CONFIDENCE_RULES;
  if (
    coverage >= r.highMinCoverage &&
    candidate.sampleSize >= r.highMinSample
  ) {
    return 'high';
  }
  if (
    coverage >= r.mediumMinCoverage &&
    candidate.sampleSize >= r.mediumMinSample
  ) {
    return 'medium';
  }
  return 'low';
};

export const toInsight = (
  candidate: Candidate,
  input: RuleInput,
  recent: readonly RecentEvent[],
): Insight => {
  const { event, context } = input;
  const insightId = insightIdFor(context.fixtureId, candidate, event.eventId);
  const coverage = dataCoverage(recent);
  return {
    schemaVersion: SCHEMA_VERSION,
    insightId,
    fixtureId: context.fixtureId,
    kind: candidate.kind,
    priority: candidate.priority,
    matchClockMs: event.matchClockMs,
    teamId: context.teamIds[candidate.side],
    ...(candidate.playerId === undefined
      ? {}
      : { playerId: candidate.playerId }),
    reasonCode: candidate.reasonCode,
    evidence: {
      insightId,
      fixtureId: context.fixtureId,
      windowStartMs: candidate.windowStartMs ?? windowStartMs(input.window),
      windowEndMs: input.window.endMs,
      eventIds: [...candidate.eventIds],
      computedMetrics: { ...candidate.computedMetrics },
      methodVersion: MOMENT_METHOD_VERSION,
      dataCoverage: coverage,
      confidenceLabel: confidenceFor(candidate, coverage),
      rationale: candidate.rationale,
      counterEvidence: candidate.counterEvidence.map((c) => ({
        description: c.description,
        eventIds: [...c.eventIds],
      })),
      generatedAt: event.wallClockUtc,
    },
    status: 'DETECTED',
    synthetic: true,
  };
};

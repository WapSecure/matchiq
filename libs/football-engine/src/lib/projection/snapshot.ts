import { SCHEMA_VERSION, type MatchSnapshot } from '@matchiq/contracts';
import { ALGORITHM_VERSION } from '../constants.js';
import { teamMetrics } from '../metrics/team-metrics.js';
import type { ProjectionState } from '../types.js';
import { hashCanonical } from '@matchiq/canonical-json';
import { possessionTotals } from './possession.js';
import {
  hasPendingCorrection,
  hasSequenceGap,
  lastSequence,
} from './projector.js';

type SnapshotBody = Omit<MatchSnapshot, 'stateHash'>;

/**
 * sha256 over the canonical JSON of the snapshot body plus the raw possession
 * milliseconds (finer than the rounded percentages), so any change to an
 * observable value or to the algorithm version changes the hash.
 */
export const hashState = (
  body: SnapshotBody,
  state: ProjectionState,
): string => {
  const { period, clockMs, possession } = state.derived;
  return hashCanonical({
    body,
    possessionMs: possessionTotals(possession, period, clockMs),
  });
};

export const toSnapshot = (state: ProjectionState): MatchSnapshot => {
  const { derived } = state;
  const metrics = teamMetrics(derived);
  const body: SnapshotBody = {
    schemaVersion: SCHEMA_VERSION,
    fixtureId: state.fixture.fixtureId,
    throughSequence: lastSequence(state),
    algorithmVersion: ALGORITHM_VERSION,
    phase: derived.phase,
    period: derived.period,
    matchClockMs: derived.clockMs,
    score: { home: metrics.home.goals, away: metrics.away.goals },
    home: metrics.home,
    away: metrics.away,
    provisional: hasSequenceGap(state) || hasPendingCorrection(state),
  };
  return { ...body, stateHash: hashState(body, state) };
};

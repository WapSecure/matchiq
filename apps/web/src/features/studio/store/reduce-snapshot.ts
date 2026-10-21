import type { MatchSnapshot, MetricValue } from '@matchiq/contracts';
import { STORE_LIMITS } from '@/constants/api';
import type { MatchData, MomentumPoint } from './types';

const valueOf = (metric: MetricValue): number | null =>
  metric.status === 'available' ? metric.value : null;

const appendMomentum = (
  series: MomentumPoint[],
  snapshot: MatchSnapshot,
): MomentumPoint[] => {
  if (snapshot.period === null) return series;
  const point: MomentumPoint = {
    period: snapshot.period,
    clockMs: snapshot.matchClockMs,
    home: valueOf(snapshot.home.momentum),
    away: valueOf(snapshot.away.momentum),
  };
  const kept = series.filter(
    (p) =>
      p.period < point.period ||
      (p.period === point.period && p.clockMs < point.clockMs),
  );
  return [...kept, point].slice(-STORE_LIMITS.momentumPointsMax);
};

/**
 * Snapshots are monotonic by `throughSequence`, so a slow REST response can
 * never roll back newer streamed state. After a seek the store is reset, so
 * the refetched snapshot applies. `authoritative` also moves the clock.
 */
export const reduceSnapshot = (
  state: MatchData,
  snapshot: MatchSnapshot,
  authoritative = false,
): Partial<MatchData> => {
  const current = state.snapshot;
  if (current && snapshot.throughSequence < current.throughSequence) {
    return {};
  }
  const clockAhead = snapshot.throughSequence >= state.lastEventSequence;
  return {
    snapshot,
    momentum: appendMomentum(state.momentum, snapshot),
    ...(clockAhead || authoritative
      ? { clock: { period: snapshot.period, ms: snapshot.matchClockMs } }
      : {}),
  };
};

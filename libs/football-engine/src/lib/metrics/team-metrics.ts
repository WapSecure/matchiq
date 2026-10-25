import type {
  MetricValue,
  PossessionBasis,
  TeamMatchMetrics,
} from '@matchiq/contracts';
import { PERCENT, ROUNDING } from '../constants.js';
import { possessionTotals } from '../projection/possession.js';
import type { DerivedState, Side, TeamTally } from '../types.js';
import { largestRemainderShares, roundTo } from '../util/numbers.js';
import { measureMetrics } from './measure-metrics.js';
import { momentumFor } from './momentum.js';
import { rollingWindow } from './windows.js';

export const percentOf = (
  numerator: number,
  denominator: number,
): MetricValue =>
  denominator === 0
    ? { status: 'unavailable', reason: 'ZERO_DENOMINATOR' }
    : {
        status: 'available',
        value: roundTo(
          (numerator / denominator) * PERCENT,
          ROUNDING.percentDecimals,
        ),
        unit: 'percent',
        numerator,
        denominator,
      };

/** Complementary shares of one whole: each is `percentOf`, but the pair sums to exactly 100. */
export const sharePair = (
  home: number,
  away: number,
): Readonly<Record<Side, MetricValue>> => {
  const denominator = home + away;
  if (denominator === 0) {
    return { home: percentOf(home, 0), away: percentOf(away, 0) };
  }
  const [homePct = 0, awayPct = 0] = largestRemainderShares(
    [home, away],
    PERCENT,
    ROUNDING.percentDecimals,
  );
  const share = (value: number, numerator: number): MetricValue => ({
    status: 'available',
    value,
    unit: 'percent',
    numerator,
    denominator,
  });
  return { home: share(homePct, home), away: share(awayPct, away) };
};

interface PossessionMetric {
  readonly basis: PossessionBasis;
  readonly value: Readonly<Record<Side, MetricValue>>;
}

/** See `possessionPct` in the metric registry for the exact definition. */
export const possessionMetric = (derived: DerivedState): PossessionMetric => {
  if (derived.possession.changeEvents === 0) {
    const home = derived.tallies.home.passesAttempted;
    const away = derived.tallies.away.passesAttempted;
    return { basis: 'EVENT_SHARE_PROXY', value: sharePair(home, away) };
  }
  const totals = possessionTotals(
    derived.possession,
    derived.period,
    derived.clockMs,
  );
  return { basis: 'TIME_WEIGHTED', value: sharePair(totals.home, totals.away) };
};

const momentumNow = (derived: DerivedState, side: Side): MetricValue =>
  derived.period === null
    ? { status: 'unavailable', reason: 'INSUFFICIENT_SAMPLE' }
    : momentumFor(
        derived.timelines,
        side,
        rollingWindow(
          derived.period,
          derived.clockMs,
          derived.periodStartClockMs,
        ),
      ).value;

/** Goals from the team's own shots (own goals credited to it are excluded) over its shots. */
const shotConversion = (tally: TeamTally): MetricValue =>
  percentOf(tally.goals - tally.ownGoalsFor, tally.shots);

const passQuality = (tally: TeamTally): MetricValue =>
  percentOf(tally.progressivePasses, tally.passesCompleted);

const countsOf = (tally: TeamTally) => ({
  goals: tally.goals,
  shots: tally.shots,
  shotsOnTarget: tally.shotsOnTarget,
  passesAttempted: tally.passesAttempted,
  passesCompleted: tally.passesCompleted,
  pressures: tally.pressures,
  recoveries: tally.recoveries,
  finalThirdEntries: tally.finalThirdEntries,
  fouls: tally.fouls,
  yellowCards: tally.yellowCards,
  redCards: tally.redCards,
});

export const teamMetrics = (
  derived: DerivedState,
): Record<Side, TeamMatchMetrics> => {
  const possession = possessionMetric(derived);
  const build = (side: Side): TeamMatchMetrics => {
    const tally = derived.tallies[side];
    return {
      ...countsOf(tally),
      passCompletionPct: percentOf(
        tally.passesCompleted,
        tally.passesAttempted,
      ),
      shotConversionPct: shotConversion(tally),
      passQualityPct: passQuality(tally),
      ...measureMetrics(tally),
      possessionPct: possession.value[side],
      possessionBasis: possession.basis,
      momentum: momentumNow(derived, side),
    };
  };
  return { home: build('home'), away: build('away') };
};

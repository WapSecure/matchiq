import type {
  MetricUnit,
  MetricValue,
  TeamMatchMetrics,
} from '@matchiq/contracts';
import { MEASURE_DECIMALS } from '../constants.js';
import type { TeamTally } from '../types.js';
import { roundTo } from '../util/numbers.js';

type MeasureKeys =
  | 'passDistanceAvgM'
  | 'passDifficultyAvg'
  | 'shotSpeedAvgKph'
  | 'shotSpeedMaxKph'
  | 'xgBaseline';

const available = (
  value: number,
  unit: MetricUnit,
  decimals: number,
  extra: { numerator?: number; denominator?: number } = {},
): MetricValue => ({
  status: 'available',
  value: roundTo(value, decimals),
  unit,
  ...extra,
});

const average = (
  sum: number,
  count: number,
  unit: MetricUnit,
  decimals: number,
): MetricValue =>
  count === 0
    ? { status: 'unavailable', reason: 'ZERO_DENOMINATOR' }
    : available(sum / count, unit, decimals, { denominator: count });

const speedAverage = (tally: TeamTally): MetricValue =>
  tally.speedShots === 0
    ? { status: 'unavailable', reason: 'NOT_GENERATED' }
    : average(
        tally.shotSpeedSumKph,
        tally.speedShots,
        'kph',
        MEASURE_DECIMALS.kph,
      );

const speedMax = (tally: TeamTally): MetricValue =>
  tally.speedShots === 0
    ? { status: 'unavailable', reason: 'NOT_GENERATED' }
    : available(tally.shotSpeedMaxKph, 'kph', MEASURE_DECIMALS.kph, {
        denominator: tally.speedShots,
      });

/** Geometry, speed and xG baseline measures; see ADR-0040. */
export const measureMetrics = (
  tally: TeamTally,
): Pick<TeamMatchMetrics, MeasureKeys> => ({
  passDistanceAvgM: average(
    tally.passDistanceSumM,
    tally.geometryPasses,
    'metres',
    MEASURE_DECIMALS.metres,
  ),
  passDifficultyAvg: average(
    tally.passDifficultySum,
    tally.geometryPasses,
    'index',
    MEASURE_DECIMALS.difficulty,
  ),
  shotSpeedAvgKph: speedAverage(tally),
  shotSpeedMaxKph: speedMax(tally),
  xgBaseline:
    tally.shots === 0
      ? { status: 'unavailable', reason: 'ZERO_DENOMINATOR' }
      : available(tally.xgSum, 'xg', MEASURE_DECIMALS.xg, {
          denominator: tally.shots,
        }),
});

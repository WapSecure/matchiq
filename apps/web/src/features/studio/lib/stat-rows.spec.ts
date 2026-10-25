import type { MatchSnapshot, MetricValue } from '@matchiq/contracts';
import { describeMetric } from '@/lib/metric-definition';
import { statRows } from './stat-rows';

const GONE: MetricValue = { status: 'unavailable', reason: 'NOT_GENERATED' };
const got = (value: number, unit: 'metres' | 'kph' | 'index'): MetricValue => ({
  status: 'available',
  value,
  unit,
});

const team = (extra: Record<string, MetricValue>) => ({
  goals: 0,
  shots: 0,
  shotsOnTarget: 0,
  passesAttempted: 0,
  passesCompleted: 0,
  passCompletionPct: GONE,
  possessionPct: GONE,
  momentum: GONE,
  ...extra,
});

const snapshot = (
  home: Record<string, MetricValue>,
  away: Record<string, MetricValue>,
) => ({ home: team(home), away: team(away) }) as unknown as MatchSnapshot;

const keys = (s: MatchSnapshot) => statRows(s).map((r) => r.key);

describe('statRows extra measures', () => {
  it('shows pass distance, difficulty and shot speed when both teams have values', () => {
    const both = {
      passDistanceAvgM: got(18, 'metres'),
      passDifficultyAvg: got(40, 'index'),
      shotSpeedAvgKph: got(95, 'kph'),
    };
    expect(keys(snapshot(both, both))).toEqual(
      expect.arrayContaining([
        'passDistanceAvgM',
        'passDifficultyAvg',
        'shotSpeedAvgKph',
      ]),
    );
  });

  it('hides a row when either team has no value', () => {
    const home = { shotSpeedAvgKph: got(95, 'kph') };
    const away = { shotSpeedAvgKph: GONE };
    expect(keys(snapshot(home, away))).not.toContain('shotSpeedAvgKph');
  });

  it('never adds the xG baseline to the comparison', () => {
    const xg = { xgBaseline: got(1.2, 'index') };
    expect(keys(snapshot(xg, xg))).not.toContain('xgBaseline');
  });
});

describe('metric definitions', () => {
  it('labels the xG baseline as synthetic and not calibrated', () => {
    expect(describeMetric('xgBaseline.home').label).toContain(
      'synthetic, not calibrated',
    );
  });
});

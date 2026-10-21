import { MetricDefinition, MetricRef } from '@matchiq/contracts';
import {
  ALGORITHM_VERSION,
  METRIC_DEFINITIONS,
  getMetricDefinition,
  verifyCitedValues,
  verifyEvidenceIds,
} from '../src/index.js';

const envelope = {
  computedMetrics: {
    'shots.home.rolling5m': 3,
    'momentum.home.rolling5m': 0.92,
  },
  eventIds: ['ev_00001', 'ev_00002'],
  counterEvidence: [{ description: 'opponent shots', eventIds: ['ev_00009'] }],
};

describe('verifyCitedValues', () => {
  it('accepts exact matches', () => {
    expect(
      verifyCitedValues(envelope, [
        { metricRef: 'shots.home.rolling5m', value: 3 },
        { metricRef: 'momentum.home.rolling5m', value: 0.92 },
      ]),
    ).toEqual([]);
  });

  it('flags unknown metrics and mismatched values, including near misses', () => {
    expect(
      verifyCitedValues(envelope, [
        { metricRef: 'shots.away.rolling5m', value: 3 },
        { metricRef: 'shots.home.rolling5m', value: 4 },
        { metricRef: 'momentum.home.rolling5m', value: 0.9 },
        { metricRef: 'toString.home', value: 1 },
      ]),
    ).toEqual([
      { metricRef: 'shots.away.rolling5m', value: 3, reason: 'UNKNOWN_METRIC' },
      {
        metricRef: 'shots.home.rolling5m',
        value: 4,
        reason: 'VALUE_MISMATCH',
        expected: 3,
      },
      {
        metricRef: 'momentum.home.rolling5m',
        value: 0.9,
        reason: 'VALUE_MISMATCH',
        expected: 0.92,
      },
      { metricRef: 'toString.home', value: 1, reason: 'UNKNOWN_METRIC' },
    ]);
  });
});

describe('verifyEvidenceIds', () => {
  it('accepts triggering and counter-evidence ids', () => {
    expect(verifyEvidenceIds(envelope, ['ev_00001', 'ev_00009'])).toEqual([]);
  });

  it('returns unknown ids once, in order', () => {
    expect(
      verifyEvidenceIds(envelope, [
        'ev_00003',
        'ev_00001',
        'ev_00004',
        'ev_00003',
      ]),
    ).toEqual(['ev_00003', 'ev_00004']);
  });
});

describe('metric registry', () => {
  it('holds valid, unique, versioned definitions', () => {
    const refs = METRIC_DEFINITIONS.map((d) => d.metricRef);
    expect(new Set(refs).size).toBe(refs.length);
    for (const definition of METRIC_DEFINITIONS) {
      expect(MetricDefinition.parse(definition)).toEqual(definition);
      expect(MetricRef.safeParse(definition.metricRef).success).toBe(true);
      expect(definition.algorithmVersion).toBe(ALGORITHM_VERSION);
    }
  });

  it('labels momentum as a windowed heuristic index and counts as observed', () => {
    expect(getMetricDefinition('momentum.away.rolling5m')).toMatchObject({
      unit: 'index',
      heuristic: true,
      windowMs: 300_000,
    });
    expect(getMetricDefinition('shots.home')).toMatchObject({
      unit: 'count',
      heuristic: false,
    });
    expect(getMetricDefinition('shots.home')?.windowMs).toBeUndefined();
    expect(getMetricDefinition('possessionPct.home')?.unit).toBe('percent');
    expect(getMetricDefinition('nope.home')).toBeUndefined();
  });
});

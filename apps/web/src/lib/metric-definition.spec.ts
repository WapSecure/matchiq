import { describe, expect, it } from 'vitest';

import { FIGURE_FALLBACK_LABEL } from '@/constants/numbers-checked';

import { describeMetric } from './metric-definition';

describe('describeMetric labels', () => {
  it('keeps the plain label for known refs', () => {
    expect(describeMetric('pressures.away.rolling5m').label).toBe(
      'Pressures (away, last 5 min)',
    );
  });

  it('names the planted demo number in plain words', () => {
    const { label } = describeMetric('fault.injected');
    expect(label).toBe('Planted wrong number (demo)');
    expect(label).not.toContain('.');
  });

  it('never shows an unknown dotted ref', () => {
    expect(describeMetric('mystery.stat.rolling9m').label).toBe(
      FIGURE_FALLBACK_LABEL,
    );
  });
});

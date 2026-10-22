import {
  formatClock,
  formatFraction,
  formatMetric,
  formatMinute,
  formatSharePair,
  formatWindow,
} from './format';

describe('match clock formatting', () => {
  it('renders cumulative scoreboard time per period', () => {
    expect(formatClock(1, 754_000)).toBe('12:34');
    expect(formatClock(2, 0)).toBe('45:00');
    expect(formatClock(null, 0)).toBe('00:00');
  });

  it('uses football minute notation with stoppage time', () => {
    expect(formatMinute(1, 0)).toBe("1'");
    expect(formatMinute(2, 21 * 60_000)).toBe("67'");
    expect(formatMinute(1, 46 * 60_000 + 5_000)).toBe("45+2'");
    expect(formatWindow(2, 14 * 60_000, 20 * 60_000)).toBe("60'–66'");
  });
});

describe('metric formatting', () => {
  it('formats by unit and never zero-fills unavailable metrics', () => {
    expect(
      formatMetric({ status: 'available', value: 54.4, unit: 'percent' }),
    ).toBe('54%');
    expect(
      formatMetric({ status: 'available', value: 7.25, unit: 'kph' }),
    ).toBe('7.3 km/h');
    expect(
      formatMetric({ status: 'unavailable', reason: 'NO_TRACKING_DATA' }),
    ).toBeNull();
    expect(formatFraction(0.937)).toBe('94%');
  });
});

describe('possession share formatting', () => {
  const pct = (value: number, numerator?: number, denominator?: number) => ({
    status: 'available' as const,
    value,
    unit: 'percent' as const,
    ...(numerator === undefined ? {} : { numerator, denominator }),
  });

  it('never shows a pair that sums to 101% (fx_comeback_42_s5: 48.5 / 51.5)', () => {
    expect(
      formatSharePair(
        pct(48.5, 2_000_511, 4_121_923),
        pct(51.5, 2_121_412, 4_121_923),
      ),
    ).toEqual(['49%', '51%']);
    expect(formatSharePair(pct(48.5), pct(51.5))).toEqual(['49%', '51%']);
  });

  it('sums to 100% for every engine split', () => {
    for (let tenths = 0; tenths <= 1000; tenths += 1) {
      const pair = formatSharePair(pct(tenths / 10), pct((1000 - tenths) / 10));
      const [h, a] = (pair ?? []).map((s) => Number.parseInt(s, 10));
      expect((h ?? 0) + (a ?? 0)).toBe(100);
    }
  });

  it('is null when either side is unavailable', () => {
    expect(
      formatSharePair(pct(50), {
        status: 'unavailable',
        reason: 'NO_TRACKING_DATA',
      }),
    ).toBeNull();
  });
});

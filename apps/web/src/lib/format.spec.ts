import {
  formatClock,
  formatFraction,
  formatMetric,
  formatMinute,
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

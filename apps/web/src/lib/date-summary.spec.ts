import { parseDate, parseZonedDateTime } from '@internationalized/date';
import { stepTime } from './date-edit';
import { summarizeDate, summarizeRange, zoneCity } from './date-summary';

const LAGOS = { locale: 'en-GB', timeZone: 'Africa/Lagos' };
const at = (iso: string) => parseZonedDateTime(`${iso}[Africa/Lagos]`);

describe('date summaries', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T13:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('names a zone by its city', () => {
    expect(zoneCity('Africa/Lagos')).toBe('Lagos');
    expect(zoneCity('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(zoneCity('UTC')).toBe('UTC');
  });

  it('formats a date with its weekday and year', () => {
    expect(summarizeDate(parseDate('2026-10-24'), LAGOS)).toBe(
      'Sat, 24 Oct 2026',
    );
  });

  it('formats a date and time to the minute, dropping this year', () => {
    expect(summarizeDate(at('2026-10-24T15:00:45'), LAGOS)).toBe(
      'Sat 24 Oct, 15:00',
    );
    expect(summarizeDate(at('2025-03-01T09:30'), LAGOS)).toBe(
      'Sat, 1 Mar 2025, 09:30',
    );
  });

  it('uses relative words for a same-day range', () => {
    const start = at('2026-10-23T14:00');
    expect(
      summarizeRange({ start, end: start.add({ minutes: 90 }) }, LAGOS),
    ).toBe('Today, 14:00–15:30');
  });

  it('spells out both ends of a multi-day range', () => {
    expect(
      summarizeRange(
        { start: at('2026-10-22T20:00'), end: at('2026-10-26T09:15') },
        LAGOS,
      ),
    ).toBe('Yesterday, 20:00 – Mon 26 Oct, 09:15');
  });

  it('localises relative words', () => {
    const start = at('2026-10-23T14:00');
    expect(
      summarizeRange(
        { start, end: start.add({ hours: 1 }) },
        { ...LAGOS, locale: 'fr-FR' },
      ),
    ).toBe('Aujourd’hui, 14:00–15:00');
  });
});

describe('stepTime', () => {
  it('snaps to the next or previous quarter hour and wraps at midnight', () => {
    expect(stepTime(at('2026-10-23T14:07'), 1).toString()).toContain('T14:15');
    expect(stepTime(at('2026-10-23T14:07'), -1).toString()).toContain('T14:00');
    expect(stepTime(at('2026-10-23T23:50'), 1).toString()).toContain(
      '2026-10-23T00:00',
    );
  });
});

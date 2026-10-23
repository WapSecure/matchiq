import { parseAbsolute } from '@internationalized/date';
import {
  dateLocaleFor,
  formatUtc,
  isoToZoned,
  presetRange,
  rangeToZoned,
  zonedToIso,
  zonedToRange,
} from './date-time';

const LAGOS = 'Africa/Lagos';
const AT = parseAbsolute('2026-10-23T14:30:00.000Z', LAGOS);

describe('dateLocaleFor', () => {
  it('keeps supported locales and reads Pidgin dates as British English', () => {
    expect(dateLocaleFor('fr-FR')).toBe('fr-FR');
    expect(dateLocaleFor('es-ES')).toBe('es-ES');
    expect(dateLocaleFor('pcm-NG')).toBe('en-GB');
    expect(dateLocaleFor(undefined)).toBe('en-GB');
  });
});

describe('ISO and zoned conversion', () => {
  it('round-trips an instant through a zone', () => {
    const zoned = isoToZoned('2026-10-23T14:30:00Z', LAGOS);
    expect(zoned?.hour).toBe(15);
    expect(zoned && zonedToIso(zoned)).toBe('2026-10-23T14:30:00.000Z');
  });

  it('returns null for empty or unparseable input', () => {
    expect(isoToZoned('', LAGOS)).toBeNull();
    expect(isoToZoned('not a date', LAGOS)).toBeNull();
    expect(
      rangeToZoned({ start: 'x', end: '2026-10-23T14:30:00Z' }, LAGOS),
    ).toBeNull();
  });

  it('orders a reversed range', () => {
    const range = zonedToRange({ start: AT, end: AT.subtract({ hours: 1 }) });
    expect(range).toEqual({
      start: '2026-10-23T13:30:00.000Z',
      end: '2026-10-23T14:30:00.000Z',
    });
  });

  it('formats UTC for display beside local time', () => {
    expect(formatUtc('2026-10-23T14:30:05.123Z')).toBe('2026-10-23 14:30:05');
  });
});

describe('presetRange', () => {
  const window = (id: Parameters<typeof presetRange>[0]) =>
    presetRange(id, {
      timeZone: LAGOS,
      at: AT,
      matchWindow: {
        start: '2026-10-23T12:00:00Z',
        end: '2026-10-23T13:45:00Z',
      },
    });

  it('resolves relative windows ending now', () => {
    expect(window('last15m')?.start.toString()).toContain('T15:15:00');
    expect(window('lastHour')?.start.toString()).toContain('T14:30:00');
    expect(window('last24h')?.start.toString()).toContain('2026-10-22T15:30');
    expect(window('last7d')?.start.toString()).toContain('2026-10-16');
    expect(window('last15m')?.end.compare(AT)).toBe(0);
  });

  it('starts "today" at local midnight, not UTC midnight', () => {
    const today = window('today');
    expect(today && zonedToIso(today.start)).toBe('2026-10-22T23:00:00.000Z');
  });

  it('uses the match window for "This match", or nothing without one', () => {
    const match = window('thisMatch');
    expect(match && zonedToRange(match)).toEqual({
      start: '2026-10-23T12:00:00.000Z',
      end: '2026-10-23T13:45:00.000Z',
    });
    expect(presetRange('thisMatch', { timeZone: LAGOS, at: AT })).toBeNull();
  });
});

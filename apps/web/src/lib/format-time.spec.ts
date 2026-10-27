import { formatRelative, formatTimestamp } from './format-time';

describe('interface date formatting', () => {
  const now = Date.parse('2026-10-27T12:03:00Z');
  const earlier = '2026-10-27T12:00:00Z';

  it('formats relative time in the selected interface locale', () => {
    expect(formatRelative(earlier, now, 'long', 'fr-FR')).toBe(
      new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(
        -3,
        'minute',
      ),
    );
  });

  it('formats absolute timestamps in the selected interface locale', () => {
    const expected = new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(earlier));
    expect(formatTimestamp(earlier, 'es-ES')).toBe(`${expected} UTC`);
  });
});

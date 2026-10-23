import { describe, expect, it } from 'vitest';
import {
  cursorAfter,
  decodeCursor,
  encodeCursor,
  InvalidCursorError,
} from './keyset-cursor.js';

const AT = '2026-10-20T12:00:00.000Z';

describe('keyset cursor', () => {
  it('round-trips a sort key', () => {
    const raw = encodeCursor('s', [AT, 'fx_comeback_42_s3']);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(raw, 's', ['timestamp', 'fixtureId'])).toEqual([
      AT,
      'fx_comeback_42_s3',
    ]);
  });

  it('round-trips integer and text parts of a per-match key', () => {
    const raw = encodeCursor('n', ['fx_a_s1', '70', 'CASUAL', 'nr_1']);
    expect(
      decodeCursor(raw, 'n', ['fixtureId', 'integer', 'text', 'text']),
    ).toEqual(['fx_a_s1', '70', 'CASUAL', 'nr_1']);
  });

  it.each([
    ['negative integer', encodeCursor('i', ['fx_a', '-1', 'in_a'])],
    ['fractional integer', encodeCursor('i', ['fx_a', '1.5', 'in_a'])],
    ['empty text', encodeCursor('i', ['fx_a', '1', ''])],
    ['overlong text', encodeCursor('i', ['fx_a', '1', 'x'.repeat(201)])],
  ])('rejects a %s part', (_name, raw) => {
    expect(() =>
      decodeCursor(raw, 'i', ['fixtureId', 'integer', 'text']),
    ).toThrow(InvalidCursorError);
  });

  it.each([
    ['garbage', 'not base64 json'],
    ['other kind', encodeCursor('t', ['fx_comeback_42'])],
    ['short', encodeCursor('s', [AT])],
    ['bad time', encodeCursor('s', ['2026-10-20', 'fx_a'])],
    ['bad id', encodeCursor('s', [AT, 'drop table'])],
    [
      'non-string',
      Buffer.from(JSON.stringify(['s', 1, 'fx_a'])).toString('base64url'),
    ],
  ])('rejects a %s cursor', (_name, raw) => {
    expect(() => decodeCursor(raw, 's', ['timestamp', 'fixtureId'])).toThrow(
      InvalidCursorError,
    );
  });

  it('emits a next cursor only when a row past the limit exists', () => {
    const key = (n: number) => [`fx_${n}`];
    expect(cursorAfter([1, 2, 3], 2, key, 't')).toEqual({
      page: [1, 2],
      nextCursor: encodeCursor('t', ['fx_2']),
    });
    expect(cursorAfter([1, 2], 2, key, 't')).toEqual({
      page: [1, 2],
      nextCursor: null,
    });
  });
});

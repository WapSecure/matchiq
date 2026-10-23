import { FixtureId } from '@matchiq/contracts';
import { PAGE_CURSOR } from '../constants.js';

export class InvalidCursorError extends Error {}

export type CursorKind =
  (typeof PAGE_CURSOR.kinds)[keyof typeof PAGE_CURSOR.kinds];

export type CursorPart = 'timestamp' | 'fixtureId';

const valid: Record<CursorPart, (value: string) => boolean> = {
  timestamp: (value) =>
    PAGE_CURSOR.timestampPattern.test(value) &&
    !Number.isNaN(Date.parse(value)),
  fixtureId: (value) => FixtureId.safeParse(value).success,
};

/**
 * Base64url JSON of `[kind, ...sort key]`. The kind tag stops a cursor from
 * one list being replayed against another.
 */
export const encodeCursor = (
  kind: CursorKind,
  parts: readonly string[],
): string =>
  Buffer.from(JSON.stringify([kind, ...parts])).toString(PAGE_CURSOR.encoding);

/** Throws `InvalidCursorError` unless `raw` is a well-formed cursor of `kind`. */
export const decodeCursor = (
  raw: string,
  kind: CursorKind,
  shape: readonly CursorPart[],
): string[] => {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(raw, PAGE_CURSOR.encoding).toString());
  } catch {
    throw new InvalidCursorError(raw);
  }
  if (
    !Array.isArray(value) ||
    value.length !== shape.length + 1 ||
    value[0] !== kind ||
    !value.every((part) => typeof part === 'string')
  ) {
    throw new InvalidCursorError(raw);
  }
  const parts = (value as string[]).slice(1);
  if (!shape.every((part, i) => valid[part](parts[i] ?? ''))) {
    throw new InvalidCursorError(raw);
  }
  return parts;
};

/** Reads one row past `limit` to learn whether another page exists. */
export const cursorAfter = <T>(
  rows: readonly T[],
  limit: number,
  keyOf: (row: T) => readonly string[],
  kind: CursorKind,
): { page: T[]; nextCursor: string | null } => {
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    page,
    nextCursor:
      rows.length > limit && last !== undefined
        ? encodeCursor(kind, keyOf(last))
        : null,
  };
};

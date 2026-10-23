import { z } from 'zod';
import { LIMITS } from './constants.js';

/** Opaque keyset position. Clients pass it back unchanged; the server validates it. */
export const PageCursor = z.string().min(1).max(LIMITS.pageCursorMax);

/** `?cursor=&limit=` for a forward-only keyset list. */
export const CursorPageQuery = (fallback: number, max: number) =>
  z.strictObject({
    cursor: PageCursor.optional(),
    limit: z.coerce.number().int().min(1).max(max).default(fallback),
  });

/**
 * The paged envelope every cursor list shares. `items` stays at the top level so
 * `{ items }` clients keep working. There is no `prevCursor`: clients keep the
 * cursors they followed to go back.
 */
export const CursorPage = <T extends z.ZodType>(item: T) =>
  z.strictObject({
    items: z.array(item),
    /** Pass back as `cursor` for the next page. Null on the last page. */
    nextCursor: PageCursor.nullable(),
    /** Every matching item across all pages, where counting is cheap. */
    total: z.int().nonnegative().optional(),
  });

export type CursorPageQuery = { cursor?: string; limit: number };
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  total?: number;
};

import { MatchEvent, ReplayStatus } from '@matchiq/contracts';
import { z } from 'zod';

/**
 * `GET /fixtures/:id/events` returns `{ items, nextAfterSequence }`. Local until
 * `libs/contracts` exports the envelope; a bare array is still tolerated.
 */
export const MatchEventPage = z
  .union([
    z.array(MatchEvent),
    z.object({
      items: z.array(MatchEvent),
      nextAfterSequence: z.int().min(-1).nullable().optional(),
    }),
  ])
  .transform((page) =>
    Array.isArray(page)
      ? { items: page, nextAfterSequence: null }
      : {
          items: page.items,
          nextAfterSequence: page.nextAfterSequence ?? null,
        },
  );

export type MatchEventPage = z.output<typeof MatchEventPage>;

/** A replay command may be acknowledged with the new status or with no body. */
export const ReplayCommandAck = ReplayStatus.nullable();
export type ReplayCommandAck = z.output<typeof ReplayCommandAck>;

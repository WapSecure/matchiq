import { z } from 'zod';
import { MatchEvent } from './events.js';
import { Insight } from './insight.js';
import { Narrative } from './narrative.js';
import { OverlayCue } from './overlay.js';
import {
  FixtureId,
  OverlayId,
  SchemaVersion,
  UtcTimestamp,
} from './primitives.js';
import { ReplayStatus } from './replay.js';
import { MatchSnapshot } from './snapshot.js';

const EnvelopeBase = z.strictObject({
  schemaVersion: SchemaVersion,
  /** Monotonic per fixture; used as the SSE `id` for Last-Event-ID resume. */
  streamSequence: z.int().nonnegative(),
  fixtureId: FixtureId,
  emittedAt: UtcTimestamp,
  traceId: z.string().min(1).max(128).optional(),
});

const message = <const T extends string, P extends z.ZodType>(
  type: T,
  payload: P,
) => EnvelopeBase.extend({ type: z.literal(type), payload });

export const StreamMessage = z.discriminatedUnion('type', [
  message('match.event', MatchEvent),
  message('match.snapshot', MatchSnapshot),
  message('insight.detected', Insight),
  message('narrative.ready', Narrative),
  message('overlay.publish', OverlayCue),
  message(
    'overlay.retract',
    z.strictObject({
      overlayId: OverlayId,
      revision: z.int().positive(),
      reason: z.string().min(1).max(200),
    }),
  ),
  message('replay.status', ReplayStatus),
  message('heartbeat', z.strictObject({})),
]);

export type StreamMessage = z.infer<typeof StreamMessage>;
export type StreamMessageType = StreamMessage['type'];
export type StreamMessageOf<T extends StreamMessageType> = Extract<
  StreamMessage,
  { type: T }
>;

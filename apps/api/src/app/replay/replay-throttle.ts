import { type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';
import { REPLAY_THROTTLE_KEY, THROTTLERS } from '../constants';

/** Marks a route as an anonymous replay control, subject to the stricter `replay` throttler. */
export const ReplayThrottled = () => SetMetadata(REPLAY_THROTTLE_KEY, true);

const isReplayControl = (context: ExecutionContext): boolean =>
  Reflect.getMetadata(REPLAY_THROTTLE_KEY, context.getHandler()) === true;

/** ADR-0010: judges drive the demo anonymously; replay controls get their own per-client budget. */
export const replayThrottler = (
  limit: number,
  ttl: number,
): ThrottlerOptions => ({
  name: THROTTLERS.replay,
  ttl,
  limit,
  skipIf: (context) => !isReplayControl(context),
});

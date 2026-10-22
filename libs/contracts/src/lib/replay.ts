import { z } from 'zod';
import { FaultPlan } from './faults.js';
import { FixtureId, MatchClockMs, Period } from './primitives.js';

export const REPLAY_SPEEDS = [1, 5, 20, 30] as const;
export const ReplaySpeed = z.union(REPLAY_SPEEDS.map((s) => z.literal(s)));

export const ReplayState = z.enum(['IDLE', 'PLAYING', 'PAUSED', 'COMPLETED']);

export const ReplayStatus = z.strictObject({
  fixtureId: FixtureId,
  state: ReplayState,
  speed: ReplaySpeed,
  appliedSequence: z.int().min(-1),
  period: Period.nullable(),
  matchClockMs: MatchClockMs,
});

export const ReplayCommand = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('start'), speed: ReplaySpeed }),
  z.strictObject({ action: z.literal('pause') }),
  z.strictObject({ action: z.literal('resume') }),
  z.strictObject({ action: z.literal('setSpeed'), speed: ReplaySpeed }),
  z.strictObject({
    action: z.literal('seek'),
    sequence: z.int().nonnegative(),
  }),
]);

/** `POST /fixtures/:templateId/sessions`; `faultPlan` is refused unless demo faults are on. */
export const CreateReplaySession = z.strictObject({
  speed: ReplaySpeed,
  faultPlan: FaultPlan.optional(),
});

export type ReplaySpeed = z.infer<typeof ReplaySpeed>;
export type ReplayState = z.infer<typeof ReplayState>;
export type ReplayStatus = z.infer<typeof ReplayStatus>;
export type ReplayCommand = z.infer<typeof ReplayCommand>;
export type CreateReplaySession = z.infer<typeof CreateReplaySession>;

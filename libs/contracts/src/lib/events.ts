import { z } from 'zod';
import { LIMITS } from './constants.js';
import {
  EventId,
  FixtureId,
  MatchClockMs,
  Period,
  PitchPoint,
  PlayerId,
  Provenance,
  SchemaVersion,
  TeamId,
  UtcTimestamp,
} from './primitives.js';

export const MatchEventType = z.enum([
  'MATCH_STARTED',
  'PERIOD_STARTED',
  'PERIOD_ENDED',
  'MATCH_ENDED',
  'PASS_ATTEMPTED',
  'PASS_COMPLETED',
  'PASS_INTERCEPTED',
  'CARRY',
  'FINAL_THIRD_ENTRY',
  'TACKLE',
  'PRESSURE_APPLIED',
  'RECOVERY',
  'POSSESSION_CHANGED',
  'SHOT',
  'GOAL',
  'SAVE',
  'FOUL',
  'CARD',
  'SUBSTITUTION',
  'PLAYER_POSITION',
  'BALL_POSITION',
  'CORRECTION',
]);

const EventBase = z.strictObject({
  schemaVersion: SchemaVersion,
  eventId: EventId,
  fixtureId: FixtureId,
  /** Authoritative replay order; unique and gap-free per fixture. */
  sequence: z.int().nonnegative(),
  period: Period,
  matchClockMs: MatchClockMs,
  wallClockUtc: UtcTimestamp,
  provenance: Provenance,
});

/** `PASS_COMPLETED` -> `PassCompletedEvent`; names generated cross-language models. */
const eventTitle = (type: string): string =>
  `${type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')}Event`;

const defineEvent = <
  const T extends z.infer<typeof MatchEventType>,
  S extends z.core.$ZodLooseShape,
>(
  type: T,
  shape: S,
) =>
  EventBase.extend({ type: z.literal(type), ...shape }).meta({
    title: eventTitle(type),
  });

const TeamActor = { teamId: TeamId, playerId: PlayerId };

export const MatchStartedEvent = defineEvent('MATCH_STARTED', {});
export const PeriodStartedEvent = defineEvent('PERIOD_STARTED', {});
export const PeriodEndedEvent = defineEvent('PERIOD_ENDED', {});
export const MatchEndedEvent = defineEvent('MATCH_ENDED', {});

export const PassAttemptedEvent = defineEvent('PASS_ATTEMPTED', {
  ...TeamActor,
  location: PitchPoint,
  targetLocation: PitchPoint,
  intendedReceiverId: PlayerId.optional(),
  underPressure: z.boolean(),
});

export const PassCompletedEvent = defineEvent('PASS_COMPLETED', {
  ...TeamActor,
  attemptEventId: EventId,
  location: PitchPoint,
});

export const PassInterceptedEvent = defineEvent('PASS_INTERCEPTED', {
  ...TeamActor,
  attemptEventId: EventId,
  location: PitchPoint,
});

export const CarryEvent = defineEvent('CARRY', {
  ...TeamActor,
  location: PitchPoint,
  endLocation: PitchPoint,
});

export const FinalThirdEntryEvent = defineEvent('FINAL_THIRD_ENTRY', {
  ...TeamActor,
  location: PitchPoint,
});

export const TackleEvent = defineEvent('TACKLE', {
  ...TeamActor,
  opponentPlayerId: PlayerId,
  location: PitchPoint,
  won: z.boolean(),
});

export const PressureAppliedEvent = defineEvent('PRESSURE_APPLIED', {
  ...TeamActor,
  targetPlayerId: PlayerId,
  location: PitchPoint,
});

export const RecoveryEvent = defineEvent('RECOVERY', {
  ...TeamActor,
  location: PitchPoint,
});

/** `teamId: null` marks contested or dead-ball time. */
export const PossessionChangedEvent = defineEvent('POSSESSION_CHANGED', {
  teamId: TeamId.nullable(),
  playerId: PlayerId.optional(),
});

export const ShotOutcome = z.enum([
  'ON_TARGET',
  'OFF_TARGET',
  'BLOCKED',
  'WOODWORK',
]);

export const ShotEvent = defineEvent('SHOT', {
  ...TeamActor,
  location: PitchPoint,
  outcome: ShotOutcome,
  bodyPart: z.enum(['RIGHT_FOOT', 'LEFT_FOOT', 'HEAD', 'OTHER']),
  /** Present only when the generator emits a measured speed. */
  speedKph: z.number().positive().max(LIMITS.maxShotSpeedKph).optional(),
});

export const GoalEvent = defineEvent('GOAL', {
  ...TeamActor,
  shotEventId: EventId,
  assistPlayerId: PlayerId.optional(),
  ownGoal: z.boolean(),
});

export const SaveEvent = defineEvent('SAVE', {
  ...TeamActor,
  shotEventId: EventId,
});

export const FoulEvent = defineEvent('FOUL', {
  ...TeamActor,
  victimPlayerId: PlayerId.optional(),
  location: PitchPoint,
});

export const CardEvent = defineEvent('CARD', {
  ...TeamActor,
  card: z.enum(['YELLOW', 'SECOND_YELLOW', 'RED']),
  foulEventId: EventId.optional(),
});

export const SubstitutionEvent = defineEvent('SUBSTITUTION', {
  teamId: TeamId,
  playerOutId: PlayerId,
  playerInId: PlayerId,
});

export const PlayerPositionEvent = defineEvent('PLAYER_POSITION', {
  ...TeamActor,
  location: PitchPoint,
  speedMps: z.number().nonnegative().max(LIMITS.maxPlayerSpeedMps).optional(),
});

export const BallPositionEvent = defineEvent('BALL_POSITION', {
  location: PitchPoint,
});

/** Corrections are append-only; an amendment is a VOID followed by a new event. */
export const CorrectionEvent = defineEvent('CORRECTION', {
  correctedEventId: EventId,
  action: z.literal('VOID'),
  reason: z.string().min(1).max(200),
});

export const MatchEvent = z.discriminatedUnion('type', [
  MatchStartedEvent,
  PeriodStartedEvent,
  PeriodEndedEvent,
  MatchEndedEvent,
  PassAttemptedEvent,
  PassCompletedEvent,
  PassInterceptedEvent,
  CarryEvent,
  FinalThirdEntryEvent,
  TackleEvent,
  PressureAppliedEvent,
  RecoveryEvent,
  PossessionChangedEvent,
  ShotEvent,
  GoalEvent,
  SaveEvent,
  FoulEvent,
  CardEvent,
  SubstitutionEvent,
  PlayerPositionEvent,
  BallPositionEvent,
  CorrectionEvent,
]);

export type MatchEventType = z.infer<typeof MatchEventType>;
export type MatchEvent = z.infer<typeof MatchEvent>;
export type MatchEventOf<T extends MatchEventType> = Extract<
  MatchEvent,
  { type: T }
>;
export type ShotOutcome = z.infer<typeof ShotOutcome>;

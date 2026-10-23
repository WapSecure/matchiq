import type {
  MatchEvent,
  MatchEventOf,
  MatchEventType,
} from '@matchiq/contracts';
import type { ValidationContext } from './context.js';
import { ISSUE_MESSAGES as M } from './issues.js';

const resolveTarget = <T extends MatchEventType>(
  ctx: ValidationContext,
  event: MatchEvent,
  ref: { field: string; id: string; type: T },
): MatchEventOf<T> | null => {
  const target = ctx.byId.get(ref.id);
  if (target === undefined) {
    ctx.report('DANGLING_REFERENCE', event, M.dangling(ref.field, ref.id));
    return null;
  }
  if (target.type !== ref.type) {
    ctx.report(
      'REFERENCE_MISMATCH',
      event,
      M.referenceType(ref.field, ref.type),
    );
    return null;
  }
  return target as MatchEventOf<T>;
};

const markResolved = (
  ctx: ValidationContext,
  event: MatchEvent,
  id: string,
): void => {
  if (ctx.resolved.has(id))
    ctx.report('REFERENCE_MISMATCH', event, M.resolvedTwice(id));
  ctx.resolved.add(id);
};

const checkPassResolution = (
  ctx: ValidationContext,
  event: MatchEventOf<'PASS_COMPLETED' | 'PASS_INTERCEPTED'>,
): void => {
  const attempt = resolveTarget(ctx, event, {
    field: 'attemptEventId',
    id: event.attemptEventId,
    type: 'PASS_ATTEMPTED',
  });
  if (attempt === null) return;
  markResolved(ctx, event, attempt.eventId);
  const sameTeam = attempt.teamId === event.teamId;
  if (sameTeam !== (event.type === 'PASS_COMPLETED')) {
    ctx.report('REFERENCE_MISMATCH', event, M.passTeam);
  }
};

const checkShotResolution = (
  ctx: ValidationContext,
  event: MatchEventOf<'GOAL' | 'SAVE'>,
): void => {
  const shot = resolveTarget(ctx, event, {
    field: 'shotEventId',
    id: event.shotEventId,
    type: 'SHOT',
  });
  if (shot === null) return;
  markResolved(ctx, event, shot.eventId);
  if (event.type === 'GOAL' && event.ownGoal) return;
  if ((shot.teamId === event.teamId) !== (event.type === 'GOAL')) {
    ctx.report('REFERENCE_MISMATCH', event, M.shotTeam);
  }
  if (event.type === 'GOAL' && shot.outcome !== 'ON_TARGET') {
    ctx.report('REFERENCE_MISMATCH', event, M.goalOffTarget);
  }
};

/** Assumes an own goal names the player who scored it, so the other side is credited. */
const creditGoal = (
  ctx: ValidationContext,
  event: MatchEventOf<'GOAL'>,
): void => {
  const teamId = event.ownGoal ? ctx.otherTeam(event.teamId) : event.teamId;
  ctx.goals.set(teamId, (ctx.goals.get(teamId) ?? 0) + 1);
};

/** A VOIDed goal no longer counts towards the score. */
const checkCorrection = (
  ctx: ValidationContext,
  event: MatchEventOf<'CORRECTION'>,
): void => {
  const target = ctx.byId.get(event.correctedEventId);
  if (target === undefined) {
    ctx.report(
      'DANGLING_REFERENCE',
      event,
      M.dangling('correctedEventId', event.correctedEventId),
    );
    return;
  }
  if (target.type !== 'GOAL') return;
  const teamId = target.ownGoal ? ctx.otherTeam(target.teamId) : target.teamId;
  ctx.goals.set(teamId, (ctx.goals.get(teamId) ?? 0) - 1);
};

const checkCardFoul = (
  ctx: ValidationContext,
  event: MatchEventOf<'CARD'>,
): void => {
  if (event.foulEventId === undefined) return;
  const foul = resolveTarget(ctx, event, {
    field: 'foulEventId',
    id: event.foulEventId,
    type: 'FOUL',
  });
  if (foul !== null && foul.playerId !== event.playerId) {
    ctx.report('REFERENCE_MISMATCH', event, M.cardFoul);
  }
};

/** References must point at earlier events of the right type; scores move only on GOAL and its VOID. */
export const checkReferences = (
  ctx: ValidationContext,
  event: MatchEvent,
): void => {
  switch (event.type) {
    case 'PASS_COMPLETED':
    case 'PASS_INTERCEPTED':
      checkPassResolution(ctx, event);
      return;
    case 'SAVE':
      checkShotResolution(ctx, event);
      return;
    case 'GOAL':
      checkShotResolution(ctx, event);
      creditGoal(ctx, event);
      return;
    case 'CARD':
      checkCardFoul(ctx, event);
      return;
    case 'CORRECTION':
      checkCorrection(ctx, event);
      return;
    default:
      return;
  }
};

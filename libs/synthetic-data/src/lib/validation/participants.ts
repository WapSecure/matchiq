import type { MatchEvent, MatchEventOf } from '@matchiq/contracts';
import type { ValidationContext } from './context.js';
import { ISSUE_MESSAGES as M } from './issues.js';

type Relation = 'same' | 'opponent';

/** Returns false when the team is unknown so dependent checks can be skipped. */
const checkTeam = (
  ctx: ValidationContext,
  event: MatchEvent,
  teamId: string,
): boolean => {
  if (ctx.isFixtureTeam(teamId)) return true;
  ctx.report('UNKNOWN_TEAM', event, M.unknownTeam(teamId));
  return false;
};

const checkPlayer = (
  ctx: ValidationContext,
  event: MatchEvent,
  playerId: string,
  teamId: string,
): void => {
  const player = ctx.players.get(playerId);
  if (player === undefined) {
    ctx.report('UNKNOWN_PLAYER', event, M.unknownPlayer(playerId));
    return;
  }
  if (player.teamId !== teamId) {
    ctx.report('WRONG_TEAM', event, M.wrongTeam(playerId, teamId));
  }
  if (!ctx.onPitch.has(playerId)) {
    ctx.report('PLAYER_NOT_ON_PITCH', event, M.notOnPitch(playerId));
  }
};

const relatedPlayers = (
  event: MatchEvent,
): readonly [string | undefined, Relation][] => {
  switch (event.type) {
    case 'PASS_ATTEMPTED':
      return [[event.intendedReceiverId, 'same']];
    case 'TACKLE':
      return [[event.opponentPlayerId, 'opponent']];
    case 'PRESSURE_APPLIED':
      return [[event.targetPlayerId, 'opponent']];
    case 'FOUL':
      return [[event.victimPlayerId, 'opponent']];
    case 'GOAL':
      return [[event.assistPlayerId, 'same']];
    default:
      return [];
  }
};

const checkSubstitution = (
  ctx: ValidationContext,
  event: MatchEventOf<'SUBSTITUTION'>,
): void => {
  const out = ctx.players.get(event.playerOutId);
  const incoming = ctx.players.get(event.playerInId);
  if (out?.teamId !== event.teamId || !ctx.onPitch.has(event.playerOutId)) {
    ctx.report('INVALID_SUBSTITUTION', event, M.subOut(event.playerOutId));
  }
  if (
    incoming?.teamId !== event.teamId ||
    ctx.everOnPitch.has(event.playerInId)
  ) {
    ctx.report('INVALID_SUBSTITUTION', event, M.subIn(event.playerInId));
  }
  ctx.onPitch.delete(event.playerOutId);
  ctx.onPitch.add(event.playerInId);
  ctx.everOnPitch.add(event.playerInId);
};

const applyCard = (
  ctx: ValidationContext,
  event: MatchEventOf<'CARD'>,
): void => {
  const cautioned = ctx.cautioned.has(event.playerId);
  if (event.card === 'SECOND_YELLOW' && !cautioned) {
    ctx.report('INVALID_CARD', event, M.secondYellow(event.playerId));
  }
  if (event.card === 'YELLOW' && cautioned) {
    ctx.report('INVALID_CARD', event, M.repeatYellow(event.playerId));
  }
  if (event.card === 'YELLOW') ctx.cautioned.add(event.playerId);
  else ctx.onPitch.delete(event.playerId);
};

const checkPossession = (
  ctx: ValidationContext,
  event: MatchEventOf<'POSSESSION_CHANGED'>,
): void => {
  if (event.teamId === null && event.playerId !== undefined) {
    ctx.report('INVALID_POSSESSION', event, M.possessionPlayer);
  }
  if (event.teamId === ctx.possession) {
    ctx.report('INVALID_POSSESSION', event, M.possessionRedundant);
  }
  if (
    event.teamId !== null &&
    checkTeam(ctx, event, event.teamId) &&
    event.playerId
  ) {
    checkPlayer(ctx, event, event.playerId, event.teamId);
  }
  ctx.possession = event.teamId;
};

/** Every named player exists, plays for the right side, and is on the pitch at that moment. */
export const checkParticipants = (
  ctx: ValidationContext,
  event: MatchEvent,
): void => {
  if (event.type === 'POSSESSION_CHANGED') {
    checkPossession(ctx, event);
    return;
  }
  if (event.type === 'SUBSTITUTION') {
    if (checkTeam(ctx, event, event.teamId)) checkSubstitution(ctx, event);
    return;
  }
  if (!('playerId' in event) || !('teamId' in event)) return;
  if (!checkTeam(ctx, event, event.teamId)) return;
  checkPlayer(ctx, event, event.playerId, event.teamId);
  for (const [playerId, relation] of relatedPlayers(event)) {
    if (playerId === undefined) continue;
    const teamId =
      relation === 'same' ? event.teamId : ctx.otherTeam(event.teamId);
    checkPlayer(ctx, event, playerId, teamId);
  }
  if (event.type === 'CARD') applyCard(ctx, event);
};

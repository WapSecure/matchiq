import type { Player } from '@matchiq/contracts';
import { DURATION, PITCH, PROBABILITY } from '../constants.js';
import type { Side } from '../types.js';
import { mirror, toPitchPoint } from './geometry.js';
import {
  type MatchState,
  currentCarrier,
  effectiveProfile,
  opponentOf,
  possessingSide,
  sampleRange,
  teamIdOf,
} from './match-state.js';
import { changePossession, stopPlay } from './possession.js';

export type CardKind = 'YELLOW' | 'RED';

const pressureProbability = (pressing: number, x: number): number => {
  const highPress =
    x < PITCH.ownThirdX ? PROBABILITY.pressureOwnThirdHighPress * pressing : 0;
  return (
    PROBABILITY.pressureBase +
    PROBABILITY.pressurePressingWeight * pressing +
    highPress
  );
};

/** Without natural dismissals, reds and second yellows are waived so only scripted beats send players off. */
const rollCard = (
  state: MatchState,
  offender: { side: Side; player: Player },
): CardKind | null => {
  const roll = state.rng.next();
  const dismissals = state.preset.naturalDismissals;
  if (roll < PROBABILITY.redGivenFoul) return dismissals ? 'RED' : null;
  if (roll >= PROBABILITY.redGivenFoul + PROBABILITY.yellowGivenFoul)
    return null;
  const cautioned = state.rosters[offender.side].isCautioned(
    offender.player.playerId,
  );
  return dismissals || !cautioned ? 'YELLOW' : null;
};

const issueCard = (
  state: MatchState,
  offender: { side: Side; player: Player; foulEventId: string },
  kind: CardKind,
): void => {
  const roster = state.rosters[offender.side];
  const card = kind === 'RED' ? 'RED' : roster.book(offender.player.playerId);
  state.sink.emit({
    type: 'CARD',
    teamId: teamIdOf(state, offender.side),
    playerId: offender.player.playerId,
    card,
    foulEventId: offender.foulEventId,
  });
  if (card !== 'YELLOW') roster.sendOff(offender.player.playerId);
};

/** The defending side fouls the current carrier; the attacking side restarts with a free kick. */
export const commitFoul = (
  state: MatchState,
  fouler: Player,
  forcedCard?: CardKind,
): void => {
  const attacker = possessingSide(state);
  const defender = opponentOf(attacker);
  const victim = currentCarrier(state);
  const foul = state.sink.emit({
    type: 'FOUL',
    teamId: teamIdOf(state, defender),
    playerId: fouler.playerId,
    victimPlayerId: victim.playerId,
    location: toPitchPoint(mirror(state.ball)),
  });
  const card =
    forcedCard ?? rollCard(state, { side: defender, player: fouler });
  if (card !== null) {
    issueCard(
      state,
      { side: defender, player: fouler, foulEventId: foul.eventId },
      card,
    );
  }
  stopPlay(state, {
    side: attacker,
    point: state.ball,
    gapMs: DURATION.foulRestartMs,
  });
};

export const pickChallenger = (state: MatchState): Player => {
  const defender = opponentOf(possessingSide(state));
  return state.rosters[defender].pickByZone(state.rng, mirror(state.ball).x, {
    outfieldOnly: true,
  });
};

/** Returns true when the attacking side lost the ball or play stopped. */
export const contestCarrier = (state: MatchState): boolean => {
  const attacker = possessingSide(state);
  const defender = opponentOf(attacker);
  const pressing = effectiveProfile(state, defender).pressing;
  const { rng } = state;
  if (!rng.chance(pressureProbability(pressing, state.ball.x))) return false;

  const carrier = currentCarrier(state);
  const challenger = pickChallenger(state);
  const location = mirror(state.ball);
  state.sink.emit({
    type: 'PRESSURE_APPLIED',
    teamId: teamIdOf(state, defender),
    playerId: challenger.playerId,
    targetPlayerId: carrier.playerId,
    location: toPitchPoint(location),
  });
  state.clock.advance(sampleRange(rng, DURATION.pressureMs));
  state.underPressure = true;

  const tackleChance =
    PROBABILITY.tackleGivenPressure +
    PROBABILITY.tacklePressingWeight * pressing;
  if (!rng.chance(tackleChance)) return false;
  if (rng.chance(PROBABILITY.foulGivenChallenge)) {
    commitFoul(state, challenger);
    return true;
  }
  const strengthGap =
    effectiveProfile(state, defender).strength -
    effectiveProfile(state, attacker).strength;
  const won = rng.chance(
    PROBABILITY.tackleWinBase + PROBABILITY.tackleStrengthSwing * strengthGap,
  );
  state.sink.emit({
    type: 'TACKLE',
    teamId: teamIdOf(state, defender),
    playerId: challenger.playerId,
    opponentPlayerId: carrier.playerId,
    location: toPitchPoint(location),
    won,
  });
  state.clock.advance(sampleRange(rng, DURATION.tackleMs));
  if (won) changePossession(state, defender, challenger, location);
  return won;
};

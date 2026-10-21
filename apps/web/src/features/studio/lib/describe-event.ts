import type { MatchEvent, MatchEventOf } from '@matchiq/contracts';
import { EVENT_DETAIL } from '@/constants/events';
import { EVENT_LABELS } from '@/constants/match';
import type { Roster } from './roster';

export type EventDescription = {
  label: string;
  detail: string | null;
  teamId: string | null;
};

const teamOf = (event: MatchEvent): string | null =>
  'teamId' in event ? event.teamId : null;

const actorOf = (event: MatchEvent, roster: Roster): string | null =>
  'playerId' in event ? roster.player(event.playerId) : null;

const join = (...parts: (string | null | undefined)[]): string | null => {
  const kept = parts.filter((p): p is string => Boolean(p));
  return kept.length > 0 ? kept.join(' · ') : null;
};

const goalDetail = (event: MatchEventOf<'GOAL'>, roster: Roster) =>
  join(
    actorOf(event, roster),
    event.ownGoal ? EVENT_DETAIL.ownGoal : null,
    event.assistPlayerId
      ? EVENT_DETAIL.assist(
          roster.player(event.assistPlayerId) ?? event.assistPlayerId,
        )
      : null,
  );

const specificDetail = (event: MatchEvent, roster: Roster): string | null => {
  switch (event.type) {
    case 'SHOT':
      return join(
        actorOf(event, roster),
        EVENT_DETAIL.shotOutcome[event.outcome],
      );
    case 'GOAL':
      return goalDetail(event, roster);
    case 'CARD':
      return join(actorOf(event, roster), EVENT_DETAIL.card[event.card]);
    case 'SUBSTITUTION':
      return EVENT_DETAIL.substitution(
        roster.player(event.playerInId) ?? event.playerInId,
        roster.player(event.playerOutId) ?? event.playerOutId,
      );
    case 'TACKLE':
      return join(
        actorOf(event, roster),
        event.won ? EVENT_DETAIL.won : EVENT_DETAIL.lost,
      );
    case 'CORRECTION':
      return EVENT_DETAIL.correction(event.correctedEventId, event.reason);
    default:
      return actorOf(event, roster);
  }
};

export const describeEvent = (
  event: MatchEvent,
  roster: Roster,
): EventDescription => ({
  label: EVENT_LABELS[event.type],
  detail: specificDetail(event, roster),
  teamId: teamOf(event),
});

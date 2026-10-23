import type { MatchEvent, MatchEventOf } from '@matchiq/contracts';
import type {
  PlayerAction,
  PlayerActionKind,
  PlayerInvolvement,
  PlayerMilestone,
  PlayerMilestoneKind,
  PlayerTally,
} from './types.js';

type ActorEvent = MatchEventOf<
  'PASS_ATTEMPTED' | 'SHOT' | 'PRESSURE_APPLIED' | 'RECOVERY' | 'GOAL' | 'CARD'
>;

const ACTION_KINDS: Readonly<Record<ActorEvent['type'], PlayerActionKind>> = {
  PASS_ATTEMPTED: 'pass',
  SHOT: 'shot',
  PRESSURE_APPLIED: 'pressure',
  RECOVERY: 'recovery',
  GOAL: 'goal',
  CARD: 'card',
};

const EMPTY_TALLY: PlayerTally = {
  passesAttempted: 0,
  passesCompleted: 0,
  shots: 0,
  shotsOnTarget: 0,
  pressures: 0,
  recoveries: 0,
  goals: 0,
  yellowCards: 0,
  redCards: 0,
};

/** Own goals are credited to the opponent, so they are not the player's involvement. */
const isActionBy = (event: MatchEvent, playerId: string): event is ActorEvent =>
  event.type in ACTION_KINDS &&
  (event as ActorEvent).playerId === playerId &&
  !(event.type === 'GOAL' && event.ownGoal);

/** Sequence order, one copy per event id, CORRECTION-voided events removed. */
const countable = (events: readonly MatchEvent[]): MatchEvent[] => {
  const voided = new Set<string>();
  const byId = new Map<string, MatchEvent>();
  for (const event of events) {
    if (event.type === 'CORRECTION') voided.add(event.correctedEventId);
    else if (!byId.has(event.eventId)) byId.set(event.eventId, event);
  }
  return [...byId.values()]
    .filter((event) => !voided.has(event.eventId))
    .sort((a, b) => a.sequence - b.sequence);
};

const tallyOf = (
  tally: PlayerTally,
  event: ActorEvent,
  completed: ReadonlySet<string>,
): PlayerTally => {
  switch (event.type) {
    case 'PASS_ATTEMPTED':
      return {
        ...tally,
        passesAttempted: tally.passesAttempted + 1,
        passesCompleted:
          tally.passesCompleted + (completed.has(event.eventId) ? 1 : 0),
      };
    case 'SHOT':
      return {
        ...tally,
        shots: tally.shots + 1,
        shotsOnTarget:
          tally.shotsOnTarget + (event.outcome === 'ON_TARGET' ? 1 : 0),
      };
    case 'PRESSURE_APPLIED':
      return { ...tally, pressures: tally.pressures + 1 };
    case 'RECOVERY':
      return { ...tally, recoveries: tally.recoveries + 1 };
    case 'GOAL':
      return { ...tally, goals: tally.goals + 1 };
    case 'CARD':
      return event.card === 'YELLOW'
        ? { ...tally, yellowCards: tally.yellowCards + 1 }
        : { ...tally, redCards: tally.redCards + 1 };
  }
};

/** The milestone this event triggers, given the milestones already reached. */
const milestoneOf = (
  event: ActorEvent,
  reached: ReadonlySet<PlayerMilestoneKind>,
): PlayerMilestoneKind | null => {
  if (event.type === 'GOAL') return 'GOAL';
  if (event.type === 'SHOT' && event.outcome === 'ON_TARGET')
    return reached.has('FIRST_SHOT_ON_TARGET') ? null : 'FIRST_SHOT_ON_TARGET';
  if (event.type !== 'CARD') return null;
  const kind: PlayerMilestoneKind =
    event.card === 'YELLOW' ? 'BOOKED' : 'SENT_OFF';
  return reached.has(kind) ? null : kind;
};

const actionOf = (event: ActorEvent): PlayerAction => ({
  eventId: event.eventId,
  sequence: event.sequence,
  period: event.period,
  clockMs: event.matchClockMs,
  kind: ACTION_KINDS[event.type],
  location: 'location' in event ? event.location : null,
});

/**
 * One player's involvement, counted only from ledger events where they are
 * the actor: passes, shots, pressures, recoveries, goals and cards. A pass
 * counts as completed when its `PASS_COMPLETED` (credited to the receiver)
 * exists.
 */
export const playerInvolvement = (
  events: readonly MatchEvent[],
  playerId: string,
): PlayerInvolvement => {
  const ledger = countable(events);
  const completed = new Set<string>();
  for (const event of ledger) {
    if (event.type === 'PASS_COMPLETED') completed.add(event.attemptEventId);
  }
  let tally = EMPTY_TALLY;
  const actions: PlayerAction[] = [];
  const milestones: PlayerMilestone[] = [];
  const reached = new Set<PlayerMilestoneKind>();
  for (const event of ledger) {
    if (!isActionBy(event, playerId)) continue;
    tally = tallyOf(tally, event, completed);
    actions.push(actionOf(event));
    const kind = milestoneOf(event, reached);
    if (kind === null) continue;
    reached.add(kind);
    milestones.push({
      kind,
      eventId: event.eventId,
      period: event.period,
      clockMs: event.matchClockMs,
    });
  }
  return { playerId, tally, actions, milestones };
};

/** Key moments that name the player or cite one of their events as evidence. */
export const momentsInvolvingPlayer = <T extends { playerId?: string }>(
  moments: readonly T[],
  involvement: Pick<PlayerInvolvement, 'playerId' | 'actions'>,
  evidenceOf: (moment: T) => readonly string[],
): T[] => {
  const own = new Set(involvement.actions.map((a) => a.eventId));
  return moments.filter(
    (moment) =>
      moment.playerId === involvement.playerId ||
      evidenceOf(moment).some((id) => own.has(id)),
  );
};

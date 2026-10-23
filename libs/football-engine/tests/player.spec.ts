import type { Insight, MatchEvent } from '@matchiq/contracts';
import { momentsInvolvingPlayer, playerInvolvement } from '../src/player.js';
import { kickedOff, MIN, player } from './builders.js';

const FOCUS = player('home');
const TEAMMATE = player('home', 4);

const as = <T extends MatchEvent>(event: T, playerId: string): T => ({
  ...event,
  playerId,
});

describe('playerInvolvement', () => {
  it('counts only events where the player is the actor', () => {
    const s = kickedOff();
    const done = s.at(1, MIN).pass('home');
    s.completed('home', done.eventId);
    s.pass('home');
    s.shot('home', 'ON_TARGET');
    s.shot('home', 'OFF_TARGET');
    s.pressure('home');
    s.recovery('home');
    s.pressure('away');
    const involvement = playerInvolvement(s.events, FOCUS);
    expect(involvement.tally).toEqual({
      passesAttempted: 2,
      passesCompleted: 1,
      shots: 2,
      shotsOnTarget: 1,
      pressures: 1,
      recoveries: 1,
      goals: 0,
      yellowCards: 0,
      redCards: 0,
    });
    expect(involvement.actions.map((a) => a.kind)).toEqual([
      'pass',
      'pass',
      'shot',
      'shot',
      'pressure',
      'recovery',
    ]);
  });

  it('credits a completed pass to the passer, not the receiver', () => {
    const s = kickedOff();
    const attempt = as(s.at(1, MIN).pass('home'), TEAMMATE);
    const received = s.completed('home', attempt.eventId);
    const events = [...s.events.slice(0, -2), attempt, received];
    expect(playerInvolvement(events, FOCUS).tally.passesAttempted).toBe(0);
    expect(playerInvolvement(events, TEAMMATE).tally).toMatchObject({
      passesAttempted: 1,
      passesCompleted: 1,
    });
  });

  it('records milestones once each, except goals', () => {
    const s = kickedOff();
    const first = s.at(1, 10 * MIN).shot('home', 'ON_TARGET');
    s.goal('home', first.eventId);
    const second = s.at(1, 30 * MIN).shot('home', 'ON_TARGET');
    s.goal('home', second.eventId);
    s.card('home', 'YELLOW');
    s.at(1, 40 * MIN).card('home', 'SECOND_YELLOW');
    const involvement = playerInvolvement(s.events, FOCUS);
    expect(involvement.milestones.map((m) => m.kind)).toEqual([
      'FIRST_SHOT_ON_TARGET',
      'GOAL',
      'GOAL',
      'BOOKED',
      'SENT_OFF',
    ]);
    expect(involvement.milestones[0]).toMatchObject({
      eventId: first.eventId,
      period: 1,
      clockMs: 10 * MIN,
    });
    expect(involvement.tally).toMatchObject({
      goals: 2,
      yellowCards: 1,
      redCards: 1,
    });
  });

  it('ignores own goals', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('away', 'ON_TARGET');
    const own = as(s.goal('away', shot.eventId, true), FOCUS);
    const involvement = playerInvolvement(
      [...s.events.slice(0, -1), own],
      FOCUS,
    );
    expect(involvement.tally.goals).toBe(0);
    expect(involvement.actions).toEqual([]);
    expect(involvement.milestones).toEqual([]);
  });

  it('drops voided events and duplicate deliveries', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    s.recovery('home');
    s.voids(shot.eventId);
    const involvement = playerInvolvement([...s.events, ...s.events], FOCUS);
    expect(involvement.tally).toMatchObject({ shots: 0, recoveries: 1 });
    expect(involvement.milestones).toEqual([]);
  });

  it('orders actions by sequence whatever the arrival order', () => {
    const s = kickedOff();
    s.at(1, MIN).pressure('home');
    s.recovery('home');
    const involvement = playerInvolvement([...s.events].reverse(), FOCUS);
    expect(involvement.actions.map((a) => a.sequence)).toEqual(
      [...involvement.actions.map((a) => a.sequence)].sort((a, b) => a - b),
    );
    expect(involvement.actions[0]?.location).toEqual({ x: 50, y: 50 });
  });

  it('returns an empty involvement for a player with no events', () => {
    const involvement = playerInvolvement(kickedOff().events, FOCUS);
    expect(involvement.actions).toEqual([]);
    expect(involvement.tally.passesAttempted).toBe(0);
  });
});

describe('momentsInvolvingPlayer', () => {
  const moment = (insightId: string, eventIds: string[], playerId?: string) =>
    ({
      insightId,
      ...(playerId ? { playerId } : {}),
      evidence: { eventIds },
    }) as unknown as Insight;

  it('keeps moments that name the player or cite their events', () => {
    const s = kickedOff();
    const mine = s.at(1, MIN).recovery('home');
    const theirs = s.recovery('away');
    const involvement = playerInvolvement(s.events, FOCUS);
    const kept = momentsInvolvingPlayer(
      [
        moment('in_a', [mine.eventId]),
        moment('in_b', [theirs.eventId]),
        moment('in_c', [theirs.eventId], FOCUS),
      ],
      involvement,
      (i) => i.evidence.eventIds,
    );
    expect(kept.map((i) => i.insightId)).toEqual(['in_a', 'in_c']);
  });
});

import type { MatchEvent } from '@matchiq/contracts';
import {
  type FixtureIssueCode,
  generateFixtureFile,
  validateFixtureEvents,
  validateFixtureFile,
} from '../src/index.js';
import { findEvent, resequence, sampleMatch } from './helpers.js';

const codes = (
  fixture: unknown,
  events: readonly unknown[],
): FixtureIssueCode[] => [
  ...new Set(validateFixtureEvents(fixture, events).issues.map((i) => i.code)),
];

const indexOf = (events: readonly MatchEvent[], event: MatchEvent): number =>
  events.findIndex((e) => e.eventId === event.eventId);

describe('validateFixtureEvents', () => {
  it('accepts a generated stream and derives the score from GOAL events', () => {
    const { fixture, events } = sampleMatch();
    const report = validateFixtureEvents(fixture, events);
    expect(report).toMatchObject({
      valid: true,
      issues: [],
      score: { home: 3, away: 2 },
    });
  });

  it('reports schema violations with paths and stops before semantic checks', () => {
    const { fixture, events } = sampleMatch();
    const broken = [...events];
    broken[5] = { ...events[5], matchClockMs: -1 } as MatchEvent;
    const report = validateFixtureEvents(fixture, broken);
    expect(report.valid).toBe(false);
    expect(report.score).toBeNull();
    expect(report.issues[0]).toMatchObject({
      code: 'SCHEMA_INVALID',
      path: ['events', 5, 'matchClockMs'],
    });
    expect(codes({ ...fixture, title: '' }, events)).toEqual([
      'SCHEMA_INVALID',
    ]);
  });

  it('detects sequence gaps, duplicate ids and foreign fixture ids', () => {
    const { fixture, events } = sampleMatch();
    expect(
      codes(
        fixture,
        events.filter((_, i) => i !== 10),
      ),
    ).toContain('SEQUENCE_GAP');
    const dup = [...events];
    dup[11] = { ...events[11], eventId: events[10]?.eventId } as MatchEvent;
    expect(codes(fixture, dup)).toEqual(['DUPLICATE_EVENT_ID']);
    const foreign = [...events];
    foreign[12] = { ...events[12], fixtureId: 'fx_other' } as MatchEvent;
    expect(codes(fixture, foreign)).toEqual(['FIXTURE_MISMATCH']);
  });

  it('detects clock regressions within a period', () => {
    const { fixture, events } = sampleMatch();
    const i = events.findIndex((e, idx) => idx > 50 && e.matchClockMs > 0);
    const broken = [...events];
    broken[i] = { ...events[i], matchClockMs: 0 } as MatchEvent;
    expect(codes(fixture, broken)).toContain('CLOCK_REGRESSION');
  });

  it('detects broken period structure and events after the final whistle', () => {
    const { fixture, events } = sampleMatch();
    const end = events.at(-1);
    if (end === undefined) throw new Error('empty');
    expect(codes(fixture, events.slice(0, -1))).toEqual(['PERIOD_STRUCTURE']);
    const extra = resequence([...events, { ...end, eventId: 'ev_999999' }]);
    expect(codes(fixture, extra)).toContain('EVENT_AFTER_MATCH_END');
    const firstEnd = findEvent(events, 'PERIOD_ENDED');
    expect(
      codes(fixture, resequence(events.filter((e) => e !== firstEnd))),
    ).toContain('PERIOD_STRUCTURE');
  });

  it('rejects players from the wrong team, unknown players and players off the pitch', () => {
    const { fixture, events } = sampleMatch();
    const pass = findEvent(events, 'PASS_ATTEMPTED');
    const awayPlayer = fixture.away.players[3]?.playerId;
    const benchPlayer = fixture.home.players.find((p) => !p.starting)?.playerId;
    const swap = (patch: Partial<MatchEvent>) => {
      const copy = [...events];
      copy[indexOf(events, pass)] = { ...pass, ...patch } as MatchEvent;
      return copy;
    };
    const wrongTeam =
      pass.teamId === fixture.home.teamId
        ? awayPlayer
        : fixture.home.players[3]?.playerId;
    expect(codes(fixture, swap({ playerId: wrongTeam }))).toContain(
      'WRONG_TEAM',
    );
    expect(codes(fixture, swap({ playerId: 'pl_nobody' }))).toEqual([
      'UNKNOWN_PLAYER',
    ]);
    expect(codes(fixture, swap({ teamId: 'tm_nobody' }))).toContain(
      'UNKNOWN_TEAM',
    );
    if (pass.teamId === fixture.home.teamId && benchPlayer !== undefined) {
      expect(codes(fixture, swap({ playerId: benchPlayer }))).toEqual([
        'PLAYER_NOT_ON_PITCH',
      ]);
    }
  });

  it('rejects actions by substituted-off and sent-off players', () => {
    const { fixture, events } = sampleMatch('red-card-swing');
    const red = findEvent(events, 'CARD', (c) => c.card === 'RED');
    const sub = findEvent(events, 'SUBSTITUTION');
    for (const [playerId, teamId, after] of [
      [red.playerId, red.teamId, indexOf(events, red)],
      [sub.playerOutId, sub.teamId, indexOf(events, sub)],
    ] as const) {
      const later = events.findIndex(
        (e, i) =>
          i > after && e.type === 'PASS_ATTEMPTED' && e.teamId === teamId,
      );
      const copy = [...events];
      copy[later] = { ...events[later], playerId } as MatchEvent;
      expect(codes(fixture, copy)).toContain('PLAYER_NOT_ON_PITCH');
    }
    const resub = resequence([
      ...events.slice(0, -1),
      { ...sub, eventId: 'ev_999998' },
      ...events.slice(-1),
    ]);
    expect(codes(fixture, resub)).toContain('INVALID_SUBSTITUTION');
  });

  it('rejects dangling, mistyped and inconsistent references', () => {
    const { fixture, events } = sampleMatch();
    const completed = findEvent(events, 'PASS_COMPLETED');
    const goal = findEvent(events, 'GOAL');
    const save = findEvent(events, 'SAVE');
    const patch = (event: MatchEvent, fields: Record<string, unknown>) => {
      const copy = [...events];
      copy[indexOf(events, event)] = { ...event, ...fields } as MatchEvent;
      return copy;
    };
    expect(
      codes(fixture, patch(completed, { attemptEventId: 'ev_999999' })),
    ).toEqual(['DANGLING_REFERENCE']);
    expect(
      codes(fixture, patch(goal, { shotEventId: completed.eventId })),
    ).toEqual(['REFERENCE_MISMATCH']);
    const savedShot = findEvent(
      events,
      'SHOT',
      (s) => s.eventId === save.shotEventId,
    );
    expect(codes(fixture, patch(save, { teamId: savedShot.teamId }))).toContain(
      'REFERENCE_MISMATCH',
    );
    const offTarget = findEvent(
      events,
      'SHOT',
      (s) => s.outcome !== 'ON_TARGET' && s.teamId === goal.teamId,
    );
    const copy = patch(goal, { shotEventId: offTarget.eventId });
    expect(codes(fixture, copy)).toContain('REFERENCE_MISMATCH');
  });

  it('rejects redundant possession changes and invalid cards', () => {
    const { fixture, events } = sampleMatch('high-press');
    const change = findEvent(
      events,
      'POSSESSION_CHANGED',
      (e) => e.teamId !== null,
    );
    const at = indexOf(events, change);
    const dup = resequence([
      ...events.slice(0, at + 1),
      { ...change, eventId: 'ev_999997' },
      ...events.slice(at + 1),
    ]);
    expect(codes(fixture, dup)).toContain('INVALID_POSSESSION');
    const yellow = findEvent(events, 'CARD', (c) => c.card === 'YELLOW');
    const copy = [...events];
    copy[indexOf(events, yellow)] = { ...yellow, card: 'SECOND_YELLOW' };
    expect(codes(fixture, copy)).toContain('INVALID_CARD');
  });
});

describe('validateFixtureFile', () => {
  it('checks the manifest against the events', () => {
    const file = structuredClone(
      generateFixtureFile({ seed: 42, scenario: 'comeback' }),
    );
    expect(validateFixtureFile(file).valid).toBe(true);
    const tampered = {
      ...file,
      manifest: {
        ...file.manifest,
        score: { home: 2, away: 2 },
        eventCount: 1,
      },
    };
    const issues = validateFixtureFile(tampered).issues.map((i) =>
      i.path?.join('.'),
    );
    expect(issues).toEqual(['manifest.eventCount', 'manifest.score']);
    const hash = {
      ...file,
      manifest: { ...file.manifest, eventsHash: '0'.repeat(64) },
    };
    expect(validateFixtureFile(hash).issues.map((i) => i.code)).toEqual([
      'MANIFEST_MISMATCH',
    ]);
  });

  it('rejects files that are not fixture files', () => {
    expect(validateFixtureFile({ events: [] }).issues[0]?.code).toBe(
      'SCHEMA_INVALID',
    );
    expect(validateFixtureFile('nope').valid).toBe(false);
  });
});

import { MatchEvent } from '../src/index.js';
import { buildPassAttempt, buildShot, provenance } from './builders.js';

describe('MatchEvent', () => {
  it('accepts a canonical pass attempt', () => {
    expect(MatchEvent.safeParse(buildPassAttempt(42)).success).toBe(true);
  });

  it('narrows by type discriminator', () => {
    const event = MatchEvent.parse(buildShot(43));
    expect(event.type === 'SHOT' && event.outcome).toBe('ON_TARGET');
  });

  it('rejects unknown event types', () => {
    const result = MatchEvent.safeParse({ ...buildShot(1), type: 'DRIBBLE' });
    expect(result.success).toBe(false);
  });

  it('rejects properties that do not belong to the event type', () => {
    const result = MatchEvent.safeParse({
      ...buildShot(1),
      attemptEventId: 'ev_00001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects coordinates outside the normalised pitch', () => {
    const result = MatchEvent.safeParse({
      ...buildShot(1),
      location: { x: 101, y: 50 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative sequence and clock values', () => {
    expect(
      MatchEvent.safeParse({ ...buildShot(1), sequence: -1 }).success,
    ).toBe(false);
    expect(
      MatchEvent.safeParse({ ...buildShot(1), matchClockMs: -5 }).success,
    ).toBe(false);
  });

  it('rejects malformed identifiers', () => {
    const result = MatchEvent.safeParse({
      ...buildShot(1),
      teamId: 'team_blue',
    });
    expect(result.success).toBe(false);
  });

  it('requires a supported provenance kind', () => {
    const result = MatchEvent.safeParse({
      ...buildShot(1),
      provenance: { ...provenance, kind: 'broadcast-feed' },
    });
    expect(result.success).toBe(false);
  });

  it('allows contested possession with a null team', () => {
    const { schemaVersion, fixtureId, period, wallClockUtc } = buildShot(1);
    const result = MatchEvent.safeParse({
      schemaVersion,
      fixtureId,
      period,
      wallClockUtc,
      provenance,
      eventId: 'ev_00002',
      sequence: 2,
      matchClockMs: 10_000,
      type: 'POSSESSION_CHANGED',
      teamId: null,
    });
    expect(result.success).toBe(true);
  });
});

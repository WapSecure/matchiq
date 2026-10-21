import type { ReplayStatus } from '@matchiq/contracts';
import { checkTransition } from './replay-transitions';

const status = (
  state: ReplayStatus['state'],
  appliedSequence = 10,
): ReplayStatus => ({
  fixtureId: 'fx_s_s1',
  state,
  speed: 30,
  appliedSequence,
  period: 1,
  matchClockMs: 0,
});

describe('checkTransition', () => {
  it.each([
    ['IDLE', { action: 'start', speed: 30 }, 'PLAYING'],
    ['PLAYING', { action: 'pause' }, 'PAUSED'],
    ['PAUSED', { action: 'resume' }, 'PLAYING'],
    ['PAUSED', { action: 'setSpeed', speed: 5 }, 'PAUSED'],
    ['PLAYING', { action: 'seek', sequence: 11 }, 'PLAYING'],
  ] as const)('accepts %s + %j -> %s', (state, command, target) => {
    const result = checkTransition(status(state), command, 1_469);
    expect(result).toEqual({
      ok: true,
      target: expect.objectContaining({ state: target }),
    });
  });

  it.each([
    ['PLAYING', { action: 'start', speed: 30 }],
    ['IDLE', { action: 'pause' }],
    ['PLAYING', { action: 'resume' }],
    ['COMPLETED', { action: 'setSpeed', speed: 5 }],
    ['IDLE', { action: 'seek', sequence: 20 }],
  ] as const)('rejects %s + %j', (state, command) => {
    expect(checkTransition(status(state), command, 1_469).ok).toBe(false);
  });

  it('allows only forward seeks inside the stream', () => {
    expect(
      checkTransition(
        status('PAUSED'),
        { action: 'seek', sequence: 10 },
        1_469,
      ),
    ).toMatchObject({ ok: false });
    expect(
      checkTransition(
        status('PAUSED'),
        { action: 'seek', sequence: 1_470 },
        1_469,
      ),
    ).toMatchObject({ ok: false });
    expect(
      checkTransition(
        status('PAUSED'),
        { action: 'seek', sequence: 1_469 },
        1_469,
      ),
    ).toMatchObject({ ok: true });
  });

  it('predicts the new speed for start and setSpeed', () => {
    const result = checkTransition(
      status('PLAYING'),
      { action: 'setSpeed', speed: 5 },
      1_469,
    );
    expect(result).toMatchObject({
      ok: true,
      target: { speed: 5, state: 'PLAYING' },
    });
  });
});

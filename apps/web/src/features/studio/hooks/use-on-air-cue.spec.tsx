import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CUE_MIN_DWELL_MS } from '@/constants/overlay';
import { cue, FX, message } from '@/test/factories';
import { status } from '@/test/session-factories';
import { nextOnAir, OFF_AIR } from '../lib/cue-dwell';
import { createMatchStore, MatchStoreProvider } from '../store';
import { useOnAirCue } from './use-on-air-cue';

const setup = () => {
  const store = createMatchStore(FX);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MatchStoreProvider fixtureId={FX} store={store}>
      {children}
    </MatchStoreProvider>
  );
  const hook = renderHook(() => useOnAirCue('BROADCAST', 'en-GB'), {
    wrapper,
  });
  const apply = (...messages: Parameters<typeof message>[]) =>
    act(() => {
      store.getState().applyMessages(messages.map((args) => message(...args)));
    });
  return { store, hook, apply };
};

const onClock = (ms: number, seq: number): Parameters<typeof message> => [
  'replay.status',
  status({ appliedSequence: seq, matchClockMs: ms }),
  seq,
];

describe('cue dwell', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds an expired cue for the minimum real-time dwell', () => {
    const { hook, apply } = setup();
    apply(onClock(600_000, 1), ['overlay.publish', cue(), 2]);
    expect(hook.result.current.cue?.overlayId).toBe('ov_1');
    // At 30x the clock leaves the window and the worker expires the cue at once.
    apply(onClock(606_000, 3), [
      'overlay.retract',
      { overlayId: 'ov_1', revision: 1, reason: 'expired' },
      4,
    ]);
    expect(hook.result.current).toMatchObject({ held: true });
    act(() => vi.advanceTimersByTime(CUE_MIN_DWELL_MS - 1));
    expect(hook.result.current.cue).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(hook.result.current.cue).toBeNull();
  });

  it('takes a retracted cue off air immediately', () => {
    const { hook, apply } = setup();
    apply(onClock(600_000, 1), ['overlay.publish', cue(), 2]);
    apply([
      'overlay.retract',
      { overlayId: 'ov_1', revision: 1, reason: 'Goal disallowed' },
      3,
    ]);
    expect(hook.result.current.cue).toBeNull();
  });

  it('lets a newer cue replace a held one', () => {
    const { hook, apply } = setup();
    apply(onClock(600_000, 1), ['overlay.publish', cue(), 2]);
    apply(onClock(606_000, 3), [
      'overlay.retract',
      { overlayId: 'ov_1', revision: 1, reason: 'expired' },
      4,
    ]);
    apply([
      'overlay.publish',
      cue({ overlayId: 'ov_2', clockStartMs: 606_000, clockEndMs: 613_000 }),
      5,
    ]);
    expect(hook.result.current).toMatchObject({
      held: false,
      cue: { overlayId: 'ov_2' },
    });
  });

  it('keeps the first on-air time across revisions of the same cue', () => {
    const first = nextOnAir(OFF_AIR, {
      candidate: cue(),
      pulled: () => false,
      now: 1_000,
    });
    const revised = nextOnAir(first, {
      candidate: cue({ revision: 2, headline: 'Agent copy' }),
      pulled: () => false,
      now: 3_000,
    });
    expect(revised).toMatchObject({ shownAt: 1_000, held: false });
    expect(revised.cue?.headline).toBe('Agent copy');
    const after = nextOnAir(revised, {
      candidate: null,
      pulled: () => false,
      now: 1_000 + CUE_MIN_DWELL_MS,
    });
    expect(after).toBe(OFF_AIR);
  });
});

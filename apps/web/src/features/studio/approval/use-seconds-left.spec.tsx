import { act, renderHook } from '@testing-library/react';
import { useSecondsLeft } from './use-seconds-left';

const DEADLINE = '2026-10-24T14:05:38.000Z';

describe('useSecondsLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T14:05:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts down in whole seconds and stops at zero', () => {
    const { result } = renderHook(() => useSecondsLeft(DEADLINE, 0));
    expect(result.current).toBe(38);
    act(() => void vi.advanceTimersByTime(8_000));
    expect(result.current).toBe(30);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(result.current).toBe(0);
  });

  it('follows the server clock when the device clock is off', () => {
    const { result } = renderHook(() => useSecondsLeft(DEADLINE, 10_000));
    expect(result.current).toBe(28);
  });

  it('reports no countdown without a deadline', () => {
    const { result } = renderHook(() => useSecondsLeft(null, 0));
    expect(result.current).toBeNull();
  });
});

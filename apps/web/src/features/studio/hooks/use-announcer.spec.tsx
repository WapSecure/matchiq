import { act, renderHook } from '@testing-library/react';
import { useThrottledAnnouncement, type Announcement } from './use-announcer';

const english: Announcement = { text: 'A new key moment', locale: 'en-GB' };
const french: Announcement = { text: 'Un nouveau temps fort', locale: 'fr-FR' };
const spanish: Announcement = { text: 'Un momento clave', locale: 'es-ES' };
const renderAnnouncement = (message: Announcement | null = english) =>
  renderHook(
    ({ message }: { message: Announcement | null }) =>
      useThrottledAnnouncement(message),
    { initialProps: { message } },
  );

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('live announcement timing and language', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => vi.useRealTimers());

  it('announces the first moment immediately, even with a zero-based clock', () => {
    const { result } = renderAnnouncement();
    advance(0);
    expect(result.current).toEqual(english);
  });

  it('keeps the spoken text and locale together while another language waits', () => {
    const { result, rerender } = renderAnnouncement();
    advance(0);
    advance(1_000);
    rerender({ message: french });
    expect(result.current).toEqual(english);
    advance(3_999);
    expect(result.current).toEqual(english);
    advance(1);
    expect(result.current).toEqual(french);
  });

  it('announces only the latest pending moment during a burst', () => {
    const { result, rerender } = renderAnnouncement();
    advance(0);
    advance(1_000);
    rerender({ message: french });
    advance(1_000);
    rerender({ message: spanish });
    advance(3_000);
    expect(result.current).toEqual(spanish);
  });

  it('cancels a pending announcement when no eligible moment remains', () => {
    const { result, rerender } = renderAnnouncement();
    advance(0);
    rerender({ message: french });
    rerender({ message: null });
    advance(5_000);
    expect(result.current).toBeNull();
  });

  it('cancels the pending timer when the announcer unmounts', () => {
    const { unmount } = renderAnnouncement();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

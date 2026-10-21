import { ManualScheduler, createSystemScheduler } from '../src/index.js';

describe('ManualScheduler', () => {
  it('runs callbacks only when advanced, in due-time then creation order', () => {
    const scheduler = new ManualScheduler();
    const order: string[] = [];
    scheduler.schedule(20, () => order.push('b'));
    scheduler.schedule(10, () => order.push('a'));
    scheduler.schedule(20, () => order.push('c'));
    scheduler.advance(9);
    expect(order).toEqual([]);
    scheduler.advance(11);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(scheduler.now()).toBe(20);
  });

  it('runs timers scheduled by callbacks within the same advance', () => {
    const scheduler = new ManualScheduler();
    const seen: number[] = [];
    scheduler.schedule(5, () => {
      seen.push(scheduler.now());
      scheduler.schedule(5, () => seen.push(scheduler.now()));
    });
    scheduler.advance(10);
    expect(seen).toEqual([5, 10]);
  });

  it('cancels timers and drains with runAll', () => {
    const scheduler = new ManualScheduler();
    const fired: number[] = [];
    const handle = scheduler.schedule(5, () => fired.push(1));
    scheduler.schedule(50, () => fired.push(2));
    scheduler.cancel(handle);
    scheduler.runAll();
    expect(fired).toEqual([2]);
    expect(scheduler.pendingCount).toBe(0);
  });
});

describe('createSystemScheduler', () => {
  it('fires real timers and supports cancellation', async () => {
    const scheduler = createSystemScheduler();
    const fired: string[] = [];
    const cancelled = scheduler.schedule(1, () => fired.push('cancelled'));
    scheduler.cancel(cancelled);
    await new Promise<void>((resolve) => {
      scheduler.schedule(5, () => {
        fired.push('ran');
        resolve();
      });
    });
    expect(fired).toEqual(['ran']);
    expect(scheduler.now()).toBeGreaterThan(0);
  });
});

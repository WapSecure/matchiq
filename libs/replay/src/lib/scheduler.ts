import { MANUAL_SCHEDULER_STEP_LIMIT } from './constants.js';

export interface TimerHandle {
  readonly id: number;
}

/** The only way replay logic touches time; inject `ManualScheduler` in tests. */
export interface Scheduler {
  now(): number;
  schedule(delayMs: number, callback: () => void): TimerHandle;
  cancel(handle: TimerHandle): void;
}

export const createSystemScheduler = (): Scheduler => {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextId = 0;
  return {
    now: () => performance.now(),
    schedule: (delayMs, callback) => {
      const id = nextId++;
      timers.set(
        id,
        setTimeout(
          () => {
            timers.delete(id);
            callback();
          },
          Math.max(0, delayMs),
        ),
      );
      return { id };
    },
    cancel: ({ id }) => {
      clearTimeout(timers.get(id));
      timers.delete(id);
    },
  };
};

interface PendingTimer {
  readonly id: number;
  readonly dueAt: number;
  readonly callback: () => void;
}

/** Virtual time: callbacks run only inside `advance`, in due-time then creation order. */
export class ManualScheduler implements Scheduler {
  private current = 0;
  private nextId = 0;
  private pending: PendingTimer[] = [];

  now(): number {
    return this.current;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  schedule(delayMs: number, callback: () => void): TimerHandle {
    const timer = {
      id: this.nextId++,
      dueAt: this.current + Math.max(0, delayMs),
      callback,
    };
    this.pending.push(timer);
    return { id: timer.id };
  }

  cancel(handle: TimerHandle): void {
    this.pending = this.pending.filter((t) => t.id !== handle.id);
  }

  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const next = this.nextDue(target);
      if (next === undefined) break;
      this.pending = this.pending.filter((t) => t.id !== next.id);
      this.current = next.dueAt;
      next.callback();
    }
    this.current = target;
  }

  /** Advances until no timers remain; `limit` guards against self-rescheduling loops. */
  runAll(limit = MANUAL_SCHEDULER_STEP_LIMIT): void {
    for (let i = 0; i < limit && this.pending.length > 0; i += 1) {
      const next = this.nextDue(Infinity);
      if (next === undefined) return;
      this.advance(next.dueAt - this.current);
    }
  }

  private nextDue(target: number): PendingTimer | undefined {
    let best: PendingTimer | undefined;
    for (const timer of this.pending) {
      if (timer.dueAt > target) continue;
      if (best === undefined || timer.dueAt < best.dueAt) best = timer;
    }
    return best;
  }
}

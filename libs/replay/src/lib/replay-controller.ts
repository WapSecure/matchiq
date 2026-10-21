import {
  type MatchEvent,
  ReplayCommand,
  type ReplaySpeed,
  type ReplayState,
  type ReplayStatus,
} from '@matchiq/contracts';
import {
  DEFAULT_REPLAY_SPEED,
  REPLAY_ERROR_MESSAGES as M,
  REPLAY_TIMING,
} from './constants.js';
import { realDelayMs } from './pacing.js';
import type { Scheduler, TimerHandle } from './scheduler.js';
import type {
  ReplayControllerOptions,
  ReplayError,
  ReplayResult,
  ReplaySignal,
  ReplayTiming,
} from './types.js';
import { validateStream } from './validate-stream.js';

type Action = ReplayCommand['action'];

export type CreateReplayResult =
  | { readonly ok: true; readonly controller: ReplayController }
  | { readonly ok: false; readonly error: ReplayError };

/**
 * Replays one fixture's events in sequence order, paced by match-clock gaps
 * divided by speed. All timing goes through the injected scheduler, and every
 * event is emitted exactly once per pass; a seek starts a new pass with a reset.
 */
export class ReplayController {
  private state: ReplayState = 'IDLE';
  private speed: ReplaySpeed = DEFAULT_REPLAY_SPEED;
  /** Index of the next event to emit; equals its sequence. */
  private cursor = 0;
  private timer: TimerHandle | null = null;
  private dueAt = 0;
  private pausedRemainingMs: number | null = null;
  /** Bumped on every transition so stale timers and re-entrant callbacks stop. */
  private generation = 0;
  private readonly events: readonly MatchEvent[];
  private readonly scheduler: Scheduler;
  private readonly onSignal: (signal: ReplaySignal) => void;
  private readonly timing: ReplayTiming;
  private readonly fixtureId: ReplayControllerOptions['fixtureId'];

  private constructor(options: ReplayControllerOptions) {
    this.events = [...options.events];
    this.scheduler = options.scheduler;
    this.onSignal = options.onSignal;
    this.timing = { ...REPLAY_TIMING, ...options.timing };
    this.fixtureId = options.fixtureId;
  }

  static create(options: ReplayControllerOptions): CreateReplayResult {
    const error = validateStream(options);
    if (error !== null) return { ok: false, error };
    return { ok: true, controller: new ReplayController(options) };
  }

  get status(): ReplayStatus {
    const last = this.events[this.cursor - 1];
    return {
      fixtureId: this.fixtureId,
      state: this.state,
      speed: this.speed,
      appliedSequence: this.cursor - 1,
      period: last?.period ?? null,
      matchClockMs: last?.matchClockMs ?? 0,
    };
  }

  execute(command: ReplayCommand): ReplayResult {
    switch (command.action) {
      case 'start':
        return this.start(command.speed);
      case 'pause':
        return this.pause();
      case 'resume':
        return this.resume();
      case 'setSpeed':
        return this.setSpeed(command.speed);
      case 'seek':
        return this.seek(command.sequence);
    }
  }

  /** Parses untrusted input against the `ReplayCommand` contract first. */
  executeUnknown(input: unknown): ReplayResult {
    const parsed = ReplayCommand.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'INVALID_COMMAND', message: M.invalidCommand },
      };
    }
    return this.execute(parsed.data);
  }

  dispose(): void {
    this.cancelTimer();
    this.generation += 1;
  }

  private start(speed: ReplaySpeed): ReplayResult {
    if (this.state !== 'IDLE') return this.reject('start');
    this.speed = speed;
    this.enterPlaying(0);
    return this.accept();
  }

  private pause(): ReplayResult {
    if (this.state !== 'PLAYING') return this.reject('pause');
    const remaining =
      this.timer === null
        ? null
        : Math.max(0, this.dueAt - this.scheduler.now());
    this.cancelTimer();
    this.generation += 1;
    this.state = 'PAUSED';
    this.pausedRemainingMs = remaining;
    return this.accept();
  }

  private resume(): ReplayResult {
    if (this.state !== 'PAUSED') return this.reject('resume');
    const delay = this.pausedRemainingMs ?? this.nextDelay();
    this.pausedRemainingMs = null;
    this.enterPlaying(delay);
    return this.accept();
  }

  private setSpeed(speed: ReplaySpeed): ReplayResult {
    const ratio = this.speed / speed;
    this.speed = speed;
    if (this.state === 'PLAYING' && this.timer !== null) {
      const remaining = Math.max(0, this.dueAt - this.scheduler.now()) * ratio;
      this.enterPlaying(remaining);
    } else if (this.state === 'PAUSED' && this.pausedRemainingMs !== null) {
      this.pausedRemainingMs *= ratio;
    }
    return this.accept();
  }

  private seek(sequence: number): ReplayResult {
    const last = this.events.length - 1;
    if (sequence > last) {
      return {
        ok: false,
        error: {
          code: 'SEEK_OUT_OF_RANGE',
          message: M.seekOutOfRange(sequence, last),
          state: this.state,
          action: 'seek',
        },
      };
    }
    const wasPlaying = this.state === 'PLAYING';
    this.cancelTimer();
    this.generation += 1;
    const generation = this.generation;
    this.cursor = sequence;
    this.state = wasPlaying ? 'PLAYING' : 'PAUSED';
    this.pausedRemainingMs = wasPlaying ? null : 0;
    this.onSignal({
      kind: 'reset',
      appliedSequence: sequence - 1,
      nextSequence: sequence,
    });
    if (wasPlaying && generation === this.generation) this.scheduleIn(0);
    return this.accept();
  }

  private enterPlaying(delayMs: number): void {
    this.cancelTimer();
    this.generation += 1;
    this.state = 'PLAYING';
    this.scheduleIn(delayMs);
  }

  private nextDelay(): number {
    const next = this.events[this.cursor];
    if (next === undefined) return 0;
    return realDelayMs(this.events[this.cursor - 1], next, {
      timing: this.timing,
      speed: this.speed,
    });
  }

  private scheduleIn(delayMs: number): void {
    const generation = this.generation;
    this.dueAt = this.scheduler.now() + delayMs;
    this.timer = this.scheduler.schedule(delayMs, () => this.tick(generation));
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.scheduler.cancel(this.timer);
    this.timer = null;
  }

  /** Emits every event that is due now; listeners may re-enter with commands. */
  private tick(generation: number): void {
    if (generation !== this.generation) return;
    this.timer = null;
    let delay = 0;
    while (delay === 0) {
      const event = this.events[this.cursor];
      if (event === undefined) {
        this.complete();
        return;
      }
      this.cursor += 1;
      this.onSignal({ kind: 'event', event });
      if (generation !== this.generation) return;
      if (this.cursor >= this.events.length) {
        this.complete();
        return;
      }
      delay = this.nextDelay();
    }
    this.scheduleIn(delay);
  }

  private complete(): void {
    this.state = 'COMPLETED';
    this.generation += 1;
    this.onSignal({ kind: 'completed' });
  }

  private accept(): ReplayResult {
    return { ok: true, status: this.status };
  }

  private reject(action: Action): ReplayResult {
    return {
      ok: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: M.invalidTransition(action, this.state),
        state: this.state,
        action,
      },
    };
  }
}

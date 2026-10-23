import type { OverlayCue } from '@matchiq/contracts';
import { OVERLAY_END_REASONS, OVERLAY_TIMING } from '../constants';

export interface ClockPoint {
  readonly period: number;
  readonly clockMs: number;
}

export type OverlayAction =
  | {
      readonly kind: 'publish';
      readonly cue: OverlayCue;
      readonly period: number;
    }
  | {
      readonly kind: 'end';
      readonly cue: OverlayCue;
      readonly status: 'EXPIRED' | 'RETRACTED';
      readonly reason: string;
    }
  | {
      readonly kind: 'drop';
      readonly cue: OverlayCue;
      readonly reason: string;
    };

interface Pending {
  readonly cue: OverlayCue;
  readonly at: ClockPoint;
}

interface Live {
  readonly cue: OverlayCue;
  readonly period: number;
}

export type CueCopy = Pick<
  OverlayCue,
  'headline' | 'body' | 'evidenceEventIds' | 'metricRefs'
>;

export interface Revision {
  readonly cue: OverlayCue | null;
  readonly commit: () => void;
}

const durationOf = (cue: OverlayCue) => cue.clockEndMs - cue.clockStartMs;

/**
 * One broadcast slot driven by the match clock (spec §26, §44). A higher
 * priority cue supersedes the live one only after the minimum dwell; others
 * wait in a bounded priority queue and are dropped once stale. Repeated
 * insights are ignored. All decisions are pure functions of the offered cues
 * and clock points, so replays at any speed schedule identically.
 */
export class OverlayScheduler {
  private live: Live | null = null;
  private queue: Pending[] = [];
  private readonly seen = new Set<string>();

  constructor(private readonly timing = OVERLAY_TIMING) {}

  get current(): OverlayCue | null {
    return this.live?.cue ?? null;
  }

  offer(cue: OverlayCue, at: ClockPoint): OverlayAction[] {
    const key = cue.insightId ?? cue.overlayId;
    if (this.seen.has(key)) return [];
    this.seen.add(key);
    const actions = this.advance(at);
    if (this.live === null) return [...actions, this.show(cue, at)];
    if (cue.priority > this.live.cue.priority && this.dwellMet(at)) {
      return [
        ...actions,
        this.end('RETRACTED', OVERLAY_END_REASONS.superseded),
        this.show(cue, at),
      ];
    }
    return [...actions, ...this.enqueue({ cue, at })];
  }

  /** Expires, supersedes and promotes cues as the match clock reaches `at`. */
  advance(at: ClockPoint): OverlayAction[] {
    const actions: OverlayAction[] = [];
    if (this.live !== null && this.live.period !== at.period) {
      actions.push(this.end('EXPIRED', OVERLAY_END_REASONS.periodEnded));
    } else if (this.live !== null && at.clockMs >= this.live.cue.clockEndMs) {
      actions.push(this.end('EXPIRED', OVERLAY_END_REASONS.expired));
    }
    actions.push(...this.pruneStale(at));
    const next = this.queue[0];
    if (next === undefined) return actions;
    if (this.live === null) {
      this.queue.shift();
      actions.push(this.show(next.cue, at));
    } else if (
      next.cue.priority > this.live.cue.priority &&
      this.dwellMet(at)
    ) {
      this.queue.shift();
      actions.push(
        this.end('RETRACTED', OVERLAY_END_REASONS.superseded),
        this.show(next.cue, at),
      );
    }
    return actions;
  }

  /** Ends the live cue and drops the queue, e.g. at a period or match end. */
  flush(reason: string): OverlayAction[] {
    const actions: OverlayAction[] = this.queue.map((p) => ({
      kind: 'drop' as const,
      cue: p.cue,
      reason,
    }));
    this.queue = [];
    if (this.live !== null) actions.unshift(this.end('EXPIRED', reason));
    return actions;
  }

  /**
   * Prepares a new revision of the live or queued cue for `insightId` with
   * new copy; timing and priority stay as scheduled. `commit` applies it, so
   * callers can apply it only after the revision is durably written. `cue` is
   * the live cue to republish, or null when the cue is queued or gone.
   */
  revise(insightId: string, copy: CueCopy): Revision {
    const index = this.queue.findIndex((p) => p.cue.insightId === insightId);
    const queued = this.queue[index];
    if (queued !== undefined) {
      const cue = { ...queued.cue, ...copy, revision: queued.cue.revision + 1 };
      return {
        cue: null,
        commit: () => {
          const at = this.queue.findIndex((p) => p.cue.insightId === insightId);
          if (at >= 0) this.queue[at] = { ...queued, cue };
        },
      };
    }
    const live = this.live;
    if (live?.cue.insightId !== insightId)
      return { cue: null, commit: () => undefined };
    const cue = { ...live.cue, ...copy, revision: live.cue.revision + 1 };
    return {
      cue,
      commit: () => {
        if (this.live?.cue.overlayId === cue.overlayId)
          this.live = { ...live, cue };
      },
    };
  }

  /**
   * Pulls the live or queued cue of an insight that no longer holds, e.g. a
   * goal voided by a CORRECTION. Corrections are part of the event stream, so
   * this stays a pure function of it. The insight is never offered again.
   */
  withdraw(insightId: string, reason: string): OverlayAction[] {
    this.seen.add(insightId);
    const queued = this.queue.filter((p) => p.cue.insightId === insightId);
    this.queue = this.queue.filter((p) => p.cue.insightId !== insightId);
    const actions: OverlayAction[] = queued.map((p) => ({
      kind: 'drop',
      cue: p.cue,
      reason,
    }));
    if (this.live?.cue.insightId === insightId) {
      actions.unshift(this.end('RETRACTED', reason));
    }
    return actions;
  }

  private dwellMet(at: ClockPoint): boolean {
    return (
      this.live !== null &&
      at.clockMs - this.live.cue.clockStartMs >= this.timing.minDwellMs
    );
  }

  private show(cue: OverlayCue, at: ClockPoint): OverlayAction {
    const shown: OverlayCue = {
      ...cue,
      clockStartMs: at.clockMs,
      clockEndMs: at.clockMs + durationOf(cue),
    };
    this.live = { cue: shown, period: at.period };
    return { kind: 'publish', cue: shown, period: at.period };
  }

  private end(status: 'EXPIRED' | 'RETRACTED', reason: string): OverlayAction {
    const live = this.live;
    if (live === null) throw new Error('no live overlay to end');
    this.live = null;
    return { kind: 'end', cue: live.cue, status, reason };
  }

  private enqueue(pending: Pending): OverlayAction[] {
    this.queue = [...this.queue, pending].sort(
      (a, b) => b.cue.priority - a.cue.priority || a.at.clockMs - b.at.clockMs,
    );
    const overflow = this.queue.slice(this.timing.maxQueueLength);
    this.queue = this.queue.slice(0, this.timing.maxQueueLength);
    return overflow.map((p) => ({
      kind: 'drop',
      cue: p.cue,
      reason: OVERLAY_END_REASONS.queueFull,
    }));
  }

  private pruneStale(at: ClockPoint): OverlayAction[] {
    const stale = (p: Pending) =>
      p.at.period !== at.period ||
      at.clockMs - p.at.clockMs > this.timing.maxQueueWaitMs;
    const dropped = this.queue.filter(stale);
    this.queue = this.queue.filter((p) => !stale(p));
    return dropped.map((p) => ({
      kind: 'drop',
      cue: p.cue,
      reason: OVERLAY_END_REASONS.stale,
    }));
  }
}

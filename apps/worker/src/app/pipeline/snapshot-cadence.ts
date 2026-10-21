import type { MatchEvent } from '@matchiq/contracts';
import { SNAPSHOT_CADENCE } from '../constants';

const ALWAYS: ReadonlySet<string> = new Set(SNAPSHOT_CADENCE.alwaysOn);

/**
 * Decides when to emit `match.snapshot`. Decisions depend only on the event
 * stream (types, count, period and match clock), never on wall time, so the
 * same events always produce the same snapshot messages at any replay speed.
 */
export class SnapshotCadence {
  private eventsSince = 0;
  private last: { period: number; clockMs: number } | null = null;

  constructor(private readonly policy = SNAPSHOT_CADENCE) {}

  shouldSnapshot(event: MatchEvent): boolean {
    this.eventsSince += 1;
    const due =
      ALWAYS.has(event.type) ||
      this.last === null ||
      this.last.period !== event.period ||
      this.eventsSince >= this.policy.maxEvents ||
      event.matchClockMs - this.last.clockMs >= this.policy.maxClockMs;
    if (due) {
      this.eventsSince = 0;
      this.last = { period: event.period, clockMs: event.matchClockMs };
    }
    return due;
  }
}

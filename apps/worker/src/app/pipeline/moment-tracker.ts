import type { Insight, MatchEvent } from '@matchiq/contracts';
import {
  createMomentCursor,
  redetectMoments,
  stepMoments,
  type MomentCursor,
  type ProjectionState,
} from '@matchiq/football-engine';

export interface MomentChanges {
  /** Moments to publish, in detection order. */
  readonly detected: readonly Insight[];
  /** Previously detected moments the corrected ledger no longer supports. */
  readonly retracted: readonly Insight[];
}

/** A correction, a late event or an event already voided invalidates the incremental cursor. */
const needsRescan = (
  state: ProjectionState,
  event: MatchEvent,
  inOrder: boolean,
): boolean =>
  event.type === 'CORRECTION' || !inOrder || state.voided.has(event.eventId);

/**
 * Key-moment detection that follows corrections (ADR-0013). In-order events
 * advance the engine's cursor. Otherwise the whole refolded ledger is
 * re-scanned and diffed by `insightId`: moments that vanished are retracted
 * and new ones are detected. A retracted id is final, so repeated or
 * duplicate events cannot bring it back, and the same event sequence always
 * yields the same changes.
 */
export class MomentTracker {
  private cursor: MomentCursor = createMomentCursor();
  private readonly live = new Map<string, Insight>();
  private readonly retracted = new Set<string>();

  step(
    state: ProjectionState,
    event: MatchEvent,
    inOrder: boolean,
  ): MomentChanges {
    if (!needsRescan(state, event, inOrder)) {
      const step = stepMoments(this.cursor, event, state.fixture);
      this.cursor = step.cursor;
      return { detected: this.admit(step.insights), retracted: [] };
    }
    const rescan = redetectMoments(state);
    this.cursor = rescan.cursor;
    const holds = new Set(rescan.insights.map((i) => i.insightId));
    const retracted = [...this.live.values()].filter(
      (i) => !holds.has(i.insightId),
    );
    for (const insight of retracted) {
      this.live.delete(insight.insightId);
      this.retracted.add(insight.insightId);
    }
    return { detected: this.admit(rescan.insights), retracted };
  }

  private admit(insights: readonly Insight[]): Insight[] {
    const fresh = insights.filter(
      (i) => !this.live.has(i.insightId) && !this.retracted.has(i.insightId),
    );
    for (const insight of fresh) this.live.set(insight.insightId, insight);
    return fresh;
  }
}

import type {
  OverlayCue,
  OverlayEditorialState,
  OverlayReview,
  OverlayStatus,
} from '@matchiq/contracts';
import type { FixtureKey, LedgerTransaction } from './ports.js';

/** A stored cue with the copy and slot a producer reviews (ADR-0022). */
export interface ReviewCueRow {
  readonly overlayId: string;
  readonly insightId: string | null;
  readonly revision: number;
  readonly status: OverlayStatus;
  readonly editorialState: OverlayEditorialState | null;
  readonly cue: OverlayCue;
  readonly period: number;
}

/** Where the session's applied events have reached. */
export interface SessionClock {
  readonly period: number | null;
  readonly matchClockMs: number;
}

export interface ApprovedCueWrite {
  readonly cue: OverlayCue;
  readonly reason: string | null;
}

export interface ReviewTransaction extends LedgerTransaction {
  /** The insight's cue, locked for the review. */
  reviewCueOfInsight(
    key: FixtureKey,
    insightId: string,
  ): Promise<ReviewCueRow | null>;
  sessionClock(key: FixtureKey): Promise<SessionClock | null>;
  /** Stores the cue as aired: `LIVE`, `APPROVED`, with the approved copy and slot. */
  airApproved(key: FixtureKey, write: ApprovedCueWrite): Promise<void>;
}

export interface ReviewReader {
  /** Cues awaiting approval, oldest first; null when the fixture does not exist. */
  reviews(key: FixtureKey): Promise<OverlayReview[] | null>;
}

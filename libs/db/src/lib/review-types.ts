import type {
  OverlayCue,
  OverlayEditorialState,
  OverlayReview,
  OverlayStatus,
} from '@matchiq/contracts';
import type { FixtureKey, LedgerTransaction } from './ports.js';

/** A stored cue with the copy and slot a producer reviews (ADR-0024). */
export interface ReviewCueRow {
  readonly overlayId: string;
  readonly insightId: string | null;
  readonly revision: number;
  readonly status: OverlayStatus;
  readonly editorialState: OverlayEditorialState | null;
  readonly cue: OverlayCue;
  readonly period: number;
  /** Wall-clock end of the approval window; null on rows stored before MQ-081. */
  readonly approvalDeadline: Date | null;
}

/** Where the session's applied events have reached. */
export interface SessionClock {
  readonly period: number | null;
  readonly matchClockMs: number;
}

export interface SweptCue {
  readonly overlayId: string;
  readonly insightId: string | null;
  readonly revision: number;
}

export interface ApprovalSweepInput {
  readonly now: Date;
  /** The batch's last applied event; null when the batch carries no events. */
  readonly clock: { period: number; matchClockMs: number } | null;
}

/** What the clocks have closed: windows that ran out, and approved cues now off screen. */
export interface ApprovalSweep {
  readonly lapsed: readonly SweptCue[];
  readonly due: readonly SweptCue[];
}

export interface ApprovedCueWrite {
  readonly cue: OverlayCue;
  readonly period: number | null;
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

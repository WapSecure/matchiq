import type { InsightKind } from '@matchiq/contracts';

/** Wording for moments a match-data correction ruled out (ADR-0013). */
export const CORRECTION_COPY = {
  badge: 'Ruled out',
  removed: (kind: InsightKind): string =>
    kind === 'GOAL'
      ? 'Goal ruled out. Removed from air.'
      : 'Ruled out by a correction. Removed from air.',
  why: (reason: string): string => `Why: ${reason}`,
  voidedGoal: 'Goal ruled out',
  /** The headline already says the goal was ruled out, so the reason drops the repeat. */
  reasonLead: /^\s*goal ruled out\s*[:\-–—]\s*/i,
} as const;

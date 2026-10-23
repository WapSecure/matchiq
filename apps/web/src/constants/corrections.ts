import type { InsightKind } from '@matchiq/contracts';

/** Wording for moments a match-data correction ruled out (ADR-0013). */
export const CORRECTION_COPY = {
  badge: 'Ruled out',
  removed: (kind: InsightKind): string =>
    kind === 'GOAL'
      ? 'Goal ruled out — removed from air'
      : 'Ruled out by a correction — removed from air',
  why: (reason: string): string => `Why: ${reason}`,
  voidedGoal: 'Goal ruled out',
} as const;

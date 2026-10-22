import type { ReplayCommand } from '@matchiq/contracts';

export const REPLAY_CAPACITY_REASON = 'replay-capacity';

/** Commands that move a session into PLAYING and so need a free slot. */
export const SLOT_ACTIONS: ReadonlySet<ReplayCommand['action']> = new Set([
  'start',
  'resume',
]);

export const SESSION_LIFECYCLE = {
  /** Upper bound on the eviction sweep period; shorter idle timeouts sweep faster. */
  maxSweepIntervalMs: 60_000,
  /** PLAYING sessions resumed at boot, most recently active first. */
  resumeScanLimit: 500,
} as const;

export const CAPACITY_LOG = {
  rejected: (fixtureId: string, action: string, active: number, max: number) =>
    `Replay ${action} for ${fixtureId} refused: ${active} of ${max} sessions active`,
  pausedAtBoot: (fixtureId: string, max: number) =>
    `Replay session ${fixtureId} paused at boot: ${max} sessions already resumed`,
  evicted: (count: number) =>
    `Released ${count} idle replay session(s) from memory`,
} as const;

export const sweepIntervalMs = (idleTimeoutMs: number): number =>
  Math.min(idleTimeoutMs, SESSION_LIFECYCLE.maxSweepIntervalMs);

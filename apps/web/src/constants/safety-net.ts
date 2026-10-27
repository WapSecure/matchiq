import type { ReplaySpeed } from '@matchiq/contracts';

/** The studio's "Show the safety net" menu; scenario wording is shared with the lobby. */
export const SAFETY_NET_COPY = {
  trigger: 'Show the safety net',
  menu: 'Start a replay with a planted failure',
  starting: 'Starting a new replay with a planted failure…',
  startFailed: "We couldn't start a new replay.",
} as const;

export const SAFETY_NET_SPEED: ReplaySpeed = 5;

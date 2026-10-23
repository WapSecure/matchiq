import type { ReplayState } from '@matchiq/contracts';

export const REPLAY_COPY = {
  region: 'Replay controls',
  start: 'Start replay',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart',
  restartHint: 'Starts this match again from kick-off as a new replay',
  restarting: 'Starting a new replay…',
  speed: 'Replay speed',
  speedOption: (speed: number) => `${speed}×`,
  seek: 'Jump ahead',
  seekValue: (sequence: number, total: number) =>
    `${Math.min(100, Math.round(((sequence + 1) / Math.max(total, 1)) * 100))}% through the replay`,
  seekHint: 'You can only jump forward. Use Restart to watch from kick-off.',
  seekForward: 'You can only jump forward',
  pending: 'Sending…',
  awaiting: 'Waiting for the replay to respond…',
  failed: "That didn't go through.",
  restartFailed: "We couldn't start a new replay.",
  state: {
    IDLE: 'Ready',
    PLAYING: 'Playing',
    PAUSED: 'Paused',
    COMPLETED: 'Full time',
  } satisfies Record<ReplayState, string>,
  unknownState: 'Checking status…',
} as const;

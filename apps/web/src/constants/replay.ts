import type { ReplayState } from '@matchiq/contracts';

export const REPLAY_COPY = {
  region: 'Replay transport',
  start: 'Start replay',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart from kick-off',
  speed: 'Replay speed',
  speedOption: (speed: number) => `${speed}×`,
  seek: 'Seek to event',
  seekValue: (sequence: number, max: number) =>
    `Event ${sequence + 1} of ${max + 1}`,
  pending: 'Sending…',
  failed: 'Replay command failed',
  state: {
    IDLE: 'Ready',
    PLAYING: 'Playing',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
  } satisfies Record<ReplayState, string>,
  unknownState: 'Not started',
} as const;

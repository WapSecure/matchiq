import type { ReplayState } from '@matchiq/contracts';

export const REPLAY_COPY = {
  region: 'Replay transport',
  start: 'Start replay',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart',
  restartHint: 'Starts a new session of this fixture from kick-off',
  restarting: 'Starting new session…',
  speed: 'Replay speed',
  speedOption: (speed: number) => `${speed}×`,
  seek: 'Skip ahead to event',
  seekValue: (sequence: number, total: number) =>
    `Event ${sequence + 1} of ${total}`,
  seekHint: 'Seeks move forward only. Restart to watch from kick-off.',
  seekForward: 'Seeks move forward only',
  pending: 'Sending…',
  awaiting: 'Waiting for the replay worker to confirm…',
  failed: 'Replay command failed',
  restartFailed: 'A new session could not be started',
  state: {
    IDLE: 'Ready',
    PLAYING: 'Playing',
    PAUSED: 'Paused',
    COMPLETED: 'Full time',
  } satisfies Record<ReplayState, string>,
  unknownState: 'Status unknown',
  /** Messages for the RFC 9457 statuses replay controls can return. */
  problems: {
    409: (detail: string) => `Not allowed right now: ${detail}`,
    429: 'Too many replay commands. Wait a few seconds and try again.',
    503: 'Replay control is temporarily unavailable. Try again shortly.',
  } as Record<number, string | ((detail: string) => string)>,
} as const;

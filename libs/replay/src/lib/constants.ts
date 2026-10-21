/** Match-clock milliseconds; real delay is the capped gap divided by the replay speed. */
export const REPLAY_TIMING = {
  /** Dead-ball stretches longer than this are compressed to it. */
  maxGapMs: 5_000,
  /** Pause inserted between the end of one period and the start of the next. */
  periodBreakMs: 3_000,
} as const;

export const DEFAULT_REPLAY_SPEED = 1;

export const REPLAY_ERROR_MESSAGES = {
  invalidTransition: (action: string, state: string) =>
    `cannot ${action} while ${state}`,
  seekOutOfRange: (sequence: number, last: number) =>
    `sequence ${sequence} is outside 0..${last}`,
  invalidCommand: 'command does not match the ReplayCommand contract',
  emptyStream: 'event stream is empty',
  sequenceGap: (index: number, sequence: number) =>
    `event at index ${index} has sequence ${sequence}; replay needs contiguous sequences from 0`,
  fixtureMismatch: (index: number) =>
    `event at index ${index} belongs to another fixture`,
} as const;

export const MANUAL_SCHEDULER_STEP_LIMIT = 1_000_000;

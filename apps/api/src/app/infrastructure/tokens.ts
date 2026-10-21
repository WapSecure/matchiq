export const DATABASE = Symbol('DATABASE');
export const REDIS = Symbol('REDIS');
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
export const FIXTURE_READER = Symbol('FIXTURE_READER');
export const EVENT_READER = Symbol('EVENT_READER');
export const STREAM_HISTORY = Symbol('STREAM_HISTORY');
export const OUTBOX_STORE = Symbol('OUTBOX_STORE');
export const STREAM_PUBLISHER = Symbol('STREAM_PUBLISHER');
export const STREAM_SUBSCRIBER = Symbol('STREAM_SUBSCRIBER');
export const OUTBOX_NOTIFIER = Symbol('OUTBOX_NOTIFIER');
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

/** Lets writers nudge the relay after commit instead of waiting for the next poll. */
export interface OutboxNotifier {
  notify(): void;
}

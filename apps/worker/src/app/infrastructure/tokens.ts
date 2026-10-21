export const DATABASE = Symbol('DATABASE');
export const REDIS = Symbol('REDIS');
export const PIPELINE_UOW = Symbol('PIPELINE_UOW');
export const FIXTURE_READER = Symbol('FIXTURE_READER');
export const TEMPLATE_STORE = Symbol('TEMPLATE_STORE');
export const SESSION_STORE = Symbol('SESSION_STORE');
export const INTELLIGENCE_READER = Symbol('INTELLIGENCE_READER');
export const INSIGHT_JOB_QUEUE = Symbol('INSIGHT_JOB_QUEUE');
export const AGENTS_CLIENT = Symbol('AGENTS_CLIENT');
export const REPLAY_SCHEDULER = Symbol('REPLAY_SCHEDULER');
export const CLOCK = Symbol('CLOCK');
export const OUTBOX_NOTIFIER = Symbol('OUTBOX_NOTIFIER');
export const SESSION_SOURCES = Symbol('SESSION_SOURCES');
export const SESSION_RUNTIME = Symbol('SESSION_RUNTIME');
export const AGENT_PIPELINE_DEPS = Symbol('AGENT_PIPELINE_DEPS');

export interface Clock {
  now(): Date;
}

/** Lets writers nudge the relay after commit instead of waiting for the next poll. */
export interface OutboxNotifier {
  notify(): void;
}

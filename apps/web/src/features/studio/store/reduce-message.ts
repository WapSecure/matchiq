import type { ReplayStatus, StreamMessage } from '@matchiq/contracts';
import { INITIAL_CONNECTION } from '@/lib/stream';
import { reduceEditorial, type StatusSource } from './reduce-editorial';
import { reduceEvents } from './reduce-events';
import {
  reduceInsight,
  reduceInsightRetract,
  reduceNarrative,
} from './reduce-insights';
import { reducePublish, reduceRetract } from './reduce-overlays';
import { reduceSnapshot } from './reduce-snapshot';
import type { MatchData } from './types';

export const initialMatchData = (fixtureId: string): MatchData => ({
  fixtureId,
  snapshot: null,
  replay: null,
  editorial: null,
  clock: { period: null, ms: 0 },
  timeline: [],
  lastEventSequence: -1,
  voided: {},
  insights: [],
  narratives: {},
  overlays: {},
  retractions: [],
  ruledOut: {},
  suppressed: {},
  reviewVersion: 0,
  momentum: [],
  connection: INITIAL_CONNECTION,
  hydrationToken: 0,
  hydrated: false,
});

export type { StatusSource };

/**
 * The worker is the authority on replay status. Stream frames arrive in order
 * and always apply; a REST read (hydration or a refetch) may be older than
 * what the stream already delivered, so it applies only when not behind.
 * Seeks only move forward (ADR-0013), so a status never rewinds derived state;
 * the clock moves only when the status is at or ahead of the applied events.
 */
export const reduceReplay = (
  state: MatchData,
  status: ReplayStatus,
  source: StatusSource = 'stream',
): Partial<MatchData> => {
  const current = state.replay;
  if (
    source === 'rest' &&
    current !== null &&
    status.appliedSequence < current.appliedSequence
  ) {
    return {};
  }
  if (status.appliedSequence >= state.lastEventSequence) {
    return {
      replay: status,
      clock: { period: status.period, ms: status.matchClockMs },
    };
  }
  return { replay: status };
};

export const reduceMessage = (
  state: MatchData,
  message: StreamMessage,
): Partial<MatchData> => {
  switch (message.type) {
    case 'match.event':
      return reduceEvents(state, [message.payload]);
    case 'match.snapshot':
      return reduceSnapshot(state, message.payload);
    case 'insight.detected':
      return reduceInsight(state, message.payload);
    case 'insight.retract':
      return reduceInsightRetract(state, message.payload);
    case 'narrative.ready':
      return reduceNarrative(state, message.payload);
    case 'overlay.publish':
      return reducePublish(state, message.payload);
    case 'overlay.retract':
      return reduceRetract(state, message.payload);
    case 'replay.status':
      return reduceReplay(state, message.payload);
    case 'editorial.status':
      return reduceEditorial(state, message.payload);
    case 'overlay.review':
      return { reviewVersion: state.reviewVersion + 1 };
    case 'heartbeat':
      return {};
  }
};

export const reduceMessages = (
  state: MatchData,
  messages: readonly StreamMessage[],
): MatchData =>
  messages.reduce<MatchData>(
    (acc, message) => ({ ...acc, ...reduceMessage(acc, message) }),
    state,
  );

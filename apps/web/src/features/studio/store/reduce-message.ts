import type { ReplayStatus, StreamMessage } from '@matchiq/contracts';
import { INITIAL_CONNECTION } from '@/lib/stream';
import { reduceEvents } from './reduce-events';
import { reduceInsight, reduceNarrative } from './reduce-insights';
import { reducePublish, reduceRetract } from './reduce-overlays';
import { reduceSnapshot } from './reduce-snapshot';
import type { MatchData } from './types';

export const initialMatchData = (fixtureId: string): MatchData => ({
  fixtureId,
  snapshot: null,
  replay: null,
  clock: { period: null, ms: 0 },
  timeline: [],
  lastEventSequence: -1,
  voided: {},
  insights: [],
  narratives: {},
  overlays: {},
  retractions: [],
  momentum: [],
  connection: INITIAL_CONNECTION,
  resyncToken: 0,
});

/**
 * Status frames may trail the events already delivered by a few sequences;
 * only a larger regression is treated as a seek.
 */
const SEEK_TOLERANCE = 10;

/**
 * A replay that moved well behind what we have applied is a seek: derived state
 * is discarded and a resync is requested so stale graphics never linger (§26).
 */
export const reduceReplay = (
  state: MatchData,
  status: ReplayStatus,
  seek = false,
): Partial<MatchData> => {
  const clock = { period: status.period, ms: status.matchClockMs };
  if (status.appliedSequence >= state.lastEventSequence) {
    return { replay: status, clock };
  }
  if (
    !seek &&
    state.lastEventSequence - status.appliedSequence <= SEEK_TOLERANCE
  ) {
    return { replay: status };
  }
  return {
    ...initialMatchData(state.fixtureId),
    connection: state.connection,
    replay: status,
    clock,
    lastEventSequence: status.appliedSequence,
    resyncToken: state.resyncToken + 1,
  };
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
    case 'narrative.ready':
      return reduceNarrative(state, message.payload);
    case 'overlay.publish':
      return reducePublish(state, message.payload);
    case 'overlay.retract':
      return reduceRetract(state, message.payload);
    case 'replay.status':
      return reduceReplay(state, message.payload);
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

import type { StreamMessage } from '@matchiq/contracts';
import { FIXTURE_ID } from './mock-fixture';
import {
  MOMENTUM_SERIES,
  mockCue,
  mockInsight,
  mockSnapshot,
  NARRATIVES,
  NOW_MS,
} from './mock-match';

type Payloaded<T extends StreamMessage['type']> = Extract<
  StreamMessage,
  { type: T }
>['payload'];

const MINUTE = 60_000;
const SNAPSHOT_STEP_MS = MINUTE;

let sequence = 0;

export const resetStreamSequence = (): void => {
  sequence = 0;
};

export const envelope = <T extends StreamMessage['type']>(
  type: T,
  payload: Payloaded<T>,
): StreamMessage =>
  ({
    schemaVersion: 1,
    streamSequence: (sequence += 1),
    fixtureId: FIXTURE_ID,
    emittedAt: '2026-10-24T15:07:12Z',
    type,
    payload,
  }) as StreamMessage;

/** Like the API, heartbeats carry no `id`, so they never move Last-Event-ID. */
export const toFrame = (message: StreamMessage): string =>
  `${message.type === 'heartbeat' ? '' : `id: ${message.streamSequence}\n`}event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`;

/** Heartbeats repeat the last delivered `streamSequence`. */
export const heartbeat = (): StreamMessage =>
  ({
    schemaVersion: 1,
    streamSequence: sequence,
    fixtureId: FIXTURE_ID,
    emittedAt: '2026-10-24T15:07:13Z',
    type: 'heartbeat',
    payload: {},
  }) as StreamMessage;

/** The opening burst of a live studio session, in stream order. */
export const initialStreamMessages = (): StreamMessage[] => {
  const start = NOW_MS - (MOMENTUM_SERIES.length - 1) * SNAPSHOT_STEP_MS;
  const status = envelope('replay.status', {
    fixtureId: FIXTURE_ID,
    state: 'PLAYING',
    speed: 20,
    appliedSequence: 640,
    period: 2,
    matchClockMs: NOW_MS,
  });
  // Envelopes are numbered on creation, so build them in stream order.
  const snapshots = MOMENTUM_SERIES.map((momentum, i) =>
    envelope(
      'match.snapshot',
      mockSnapshot(
        start + i * SNAPSHOT_STEP_MS,
        momentum,
        640 - MOMENTUM_SERIES.length + i + 1,
      ),
    ),
  );
  return [
    status,
    ...snapshots,
    envelope('insight.detected', mockInsight()),
    envelope('narrative.ready', NARRATIVES.broadcastEn),
    envelope('narrative.ready', NARRATIVES.broadcastFr),
    envelope('narrative.ready', NARRATIVES.casualEn),
    envelope('narrative.ready', NARRATIVES.analystEn),
    envelope('overlay.publish', mockCue()),
    heartbeat(),
  ];
};

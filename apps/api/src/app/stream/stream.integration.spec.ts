import { StreamMessage, type MatchEvent } from '@matchiq/contracts';
import type { StreamPublisher } from '@matchiq/db';
import { buildTestEvent, buildTestFixture } from '@matchiq/db/testing';
import { SseClient } from '../../test/sse-client';
import {
  batchOf,
  createFixture,
  postJson,
  jsonOf,
  startTestApp,
  type TestApp,
} from '../../test/test-app';
import { STREAM_PUBLISHER } from '../infrastructure/tokens';
import { OutboxRelayService } from '../outbox/outbox-relay.service';
import { StreamService } from './stream.service';

jest.setTimeout(20_000);

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const ingest = async (t: TestApp, fixtureId: string, sequences: number[]) => {
  const events: MatchEvent[] = sequences.map((s) =>
    buildTestEvent(fixtureId, s),
  );
  const res = await postJson(
    `${t.baseUrl}/fixtures/${fixtureId}/events:batch`,
    batchOf(fixtureId, events),
  );
  expect(res.status).toBe(202);
};

const waitUntilPublished = async (t: TestApp, count: number) => {
  for (let i = 0; i < 200; i += 1) {
    const { rows } = await t.sql.query<{ n: number }>(
      'select count(*)::int as n from stream_messages where published_at is not null',
    );
    if ((rows[0]?.n ?? 0) >= count) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('outbox not published');
};

describe('SSE stream with the live relay (integration)', () => {
  const FX = 'fx_stream';
  let t: TestApp;
  const url = (query = '') => `${t.baseUrl}/fixtures/${FX}/stream${query}`;

  beforeAll(async () => {
    t = await startTestApp();
    await createFixture(t, buildTestFixture(FX));
    await ingest(t, FX, [0, 1, 2]);
    await waitUntilPublished(t, 3);
  });

  afterAll(() => t.close());

  it('resumes from Last-Event-ID: exactly the missed messages, then live ones', async () => {
    const client = await SseClient.connect(url(), { 'last-event-id': '1' });
    expect(client.status).toBe(200);
    await client.waitFor((c) => c.ids.length >= 2);
    await ingest(t, FX, [3, 4]);
    await client.waitFor((c) => c.ids.length >= 4);
    await client.waitFor((c) => c.frames.some((f) => f.event === 'heartbeat'));
    await client.close();

    expect(client.ids).toEqual([2, 3, 4, 5]);
    const messages = client.frames
      .filter((f) => f.id !== undefined)
      .map((f) => StreamMessage.parse(JSON.parse(f.data)));
    expect(messages.map((m) => [m.type, m.streamSequence])).toEqual(
      [2, 3, 4, 5].map((s) => ['match.event', s]),
    );
    const heartbeat = client.frames.find((f) => f.event === 'heartbeat');
    expect(heartbeat?.id).toBeUndefined();
    expect(StreamMessage.parse(JSON.parse(heartbeat?.data ?? '')).type).toBe(
      'heartbeat',
    );
  });

  it('replays the whole stream for ?lastEventId=0', async () => {
    const client = await SseClient.connect(url('?lastEventId=0'));
    await client.waitFor((c) => c.ids.length >= 5);
    await client.close();
    expect(client.ids).toEqual([1, 2, 3, 4, 5]);
  });

  it('starts at the live head when no Last-Event-ID is sent', async () => {
    const client = await SseClient.connect(url());
    await client.waitFor((c) => c.frames.some((f) => f.event === 'heartbeat'));
    await ingest(t, FX, [5]);
    await client.waitFor((c) => c.ids.length >= 1);
    await client.close();
    expect(client.ids).toEqual([6]);
  });

  it('releases the session when the client disconnects', async () => {
    const streams = t.app.get(StreamService);
    const client = await SseClient.connect(url());
    await client.waitFor(() => streams.openSessions > 0);
    await client.close();
    await client.waitFor(() => streams.openSessions === 0);
  });

  it('answers 404 for unknown fixtures and 400 for a malformed Last-Event-ID', async () => {
    const missing = await fetch(`${t.baseUrl}/fixtures/fx_nowhere/stream`);
    expect(missing.status).toBe(404);
    const bad = await fetch(url(), { headers: { 'last-event-id': 'abc' } });
    expect(bad.status).toBe(400);
    expect((await jsonOf(bad)).type).toBe('urn:matchiq:problem:invalid-header');
  });
});

describe('SSE gap filling and de-duplication (integration)', () => {
  const FX = 'fx_gaps';
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp({ OUTBOX_RELAY_ENABLED: 'false' });
    await createFixture(t, buildTestFixture(FX));
    await ingest(t, FX, [0, 1]);
  });

  afterAll(() => t.close());

  it('fills a live gap from Postgres and drops at-least-once repeats', async () => {
    const client = await SseClient.connect(
      `${t.baseUrl}/fixtures/${FX}/stream?lastEventId=0`,
    );
    await client.waitFor((c) => c.ids.length >= 2);
    await ingest(t, FX, [2, 3]);

    // Deliver only sequence 4 live, as an out-of-order relay would.
    const [latest] = await t.sql
      .query<{ message: StreamMessage }>(
        'select message from stream_messages where stream_sequence = 4',
      )
      .then((r) => r.rows);
    if (!latest) throw new Error('missing outbox row');
    const publisher = t.app.get<StreamPublisher>(STREAM_PUBLISHER);
    await publisher.publish(
      { orgId: 'org_demo', fixtureId: FX },
      latest.message,
    );
    await client.waitFor((c) => c.ids.length >= 4);

    // Now the relay delivers everything, including what the client already has.
    await t.app.get(OutboxRelayService).drainOnce();
    await ingest(t, FX, [4]);
    await t.app.get(OutboxRelayService).drainOnce();
    await client.waitFor((c) => c.ids.length >= 5);
    await client.close();
    expect(client.ids).toEqual(range(1, 5));
  });
});

import type { IngestBatchResponse, MatchEvent } from '@matchiq/contracts';
import type { EventPage } from '../fixtures/fixtures.service';
import { buildTestEvent, buildTestFixture } from '@matchiq/db/testing';
import {
  AUTH_HEADER,
  batchOf,
  countRows,
  createFixture,
  postJson,
  jsonOf,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(20_000);

const FX = 'fx_ingest';
const events = (from: number, to: number): MatchEvent[] =>
  Array.from({ length: to - from + 1 }, (_, i) => buildTestEvent(FX, from + i));

describe('Event ingest (integration)', () => {
  let t: TestApp;
  const ingest = (body: unknown, headers?: Record<string, string>) =>
    postJson(`${t.baseUrl}/fixtures/${FX}/events:batch`, body, headers);

  beforeAll(async () => {
    // Relay off: outbox rows must stay observable as written by the ingest transaction.
    t = await startTestApp({ OUTBOX_RELAY_ENABLED: 'false' });
    await createFixture(t, buildTestFixture(FX));
  });

  afterAll(() => t.close());

  it('accepts a batch and writes events and outbox rows together', async () => {
    const res = await ingest(batchOf(FX, events(0, 2)));
    expect(res.status).toBe(202);
    const body = (await res.json()) as IngestBatchResponse;
    expect(body).toMatchObject({
      accepted: 3,
      duplicates: 0,
      rejected: 0,
      lastAcceptedSequence: 2,
    });
    expect(body.ingestionId).toMatch(/^ing_/);
    expect(await countRows(t.sql, 'match_events')).toBe(3);
    const outbox = await t.sql.query<{
      seq: string;
      type: string;
      eid: string;
    }>(
      `select stream_sequence as seq, type, message->'payload'->>'eventId' as eid
         from stream_messages order by stream_sequence`,
    );
    expect(outbox.rows).toEqual([
      { seq: '1', type: 'match.event', eid: 'ev_00000' },
      { seq: '2', type: 'match.event', eid: 'ev_00001' },
      { seq: '3', type: 'match.event', eid: 'ev_00002' },
    ]);
  });

  it('counts an identical re-submission as duplicates and writes nothing', async () => {
    const res = await ingest(batchOf(FX, events(0, 2)));
    expect(res.status).toBe(202);
    expect(await jsonOf(res)).toMatchObject({
      accepted: 0,
      duplicates: 3,
      lastAcceptedSequence: -1,
    });
    expect(await countRows(t.sql, 'match_events')).toBe(3);
    expect(await countRows(t.sql, 'stream_messages')).toBe(3);
  });

  it('accepts the new part of a partially duplicate batch', async () => {
    const res = await ingest(batchOf(FX, events(2, 4)));
    expect(await jsonOf(res)).toMatchObject({
      accepted: 2,
      duplicates: 1,
      lastAcceptedSequence: 4,
    });
    expect(await countRows(t.sql, 'stream_messages')).toBe(5);
  });

  it('answers 409 for a reused eventId with a changed body, atomically', async () => {
    const changed = buildTestEvent(FX, 1, { matchClockMs: 1 });
    const res = await ingest(batchOf(FX, [buildTestEvent(FX, 5), changed]));
    expect(res.status).toBe(409);
    const problem = await jsonOf(res);
    expect(problem.type).toBe('urn:matchiq:problem:event-conflict');
    expect(problem.errors).toEqual([
      expect.objectContaining({ path: '$.events.1' }),
    ]);
    expect(await countRows(t.sql, 'match_events')).toBe(5);
    expect(await countRows(t.sql, 'stream_messages')).toBe(5);
  });

  it('answers 409 when a sequence is taken by a different event', async () => {
    const res = await ingest(
      batchOf(FX, [buildTestEvent(FX, 3, { eventId: 'ev_other' })]),
    );
    expect(res.status).toBe(409);
    expect((await jsonOf(res)).errors?.[0]?.message).toContain('sequence');
  });

  it('answers 409 for conflicting repeats inside one batch', async () => {
    const res = await ingest(
      batchOf(FX, [
        buildTestEvent(FX, 9),
        buildTestEvent(FX, 9, { eventId: 'ev_twin' }),
      ]),
    );
    expect(res.status).toBe(409);
  });

  it('answers 422 when events belong to another fixture', async () => {
    const res = await ingest({
      ...batchOf(FX, [buildTestEvent('fx_elsewhere', 20)]),
    });
    expect(res.status).toBe(422);
    expect((await jsonOf(res)).errors).toEqual([
      expect.objectContaining({ path: '$.events.0.fixtureId' }),
    ]);
  });

  it('answers 422 for contract-invalid events and 404 for unknown fixtures', async () => {
    const invalid = await ingest(
      batchOf(FX, [{ ...buildTestEvent(FX, 30), period: 9 }]),
    );
    expect(invalid.status).toBe(422);
    const unknown = await postJson(
      `${t.baseUrl}/fixtures/fx_nowhere/events:batch`,
      batchOf('fx_nowhere', [buildTestEvent('fx_nowhere', 0)]),
    );
    expect(unknown.status).toBe(404);
  });

  it('replays the original response for a repeated Idempotency-Key', async () => {
    const headers = { ...AUTH_HEADER, 'idempotency-key': 'batch-10-11' };
    const body = batchOf(FX, events(10, 11));
    const first = (await (
      await ingest(body, headers)
    ).json()) as IngestBatchResponse;
    const again = await ingest(body, headers);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(await again.json()).toEqual(first);
    expect(first.accepted).toBe(2);
  });

  it('answers 422 event-order naming the event when a clock runs backwards', async () => {
    const res = await ingest(
      batchOf(FX, [buildTestEvent(FX, 12, { matchClockMs: 1_000 })]),
    );
    expect(res.status).toBe(422);
    const problem = await jsonOf(res);
    expect(problem.type).toBe('urn:matchiq:problem:event-order');
    expect(JSON.stringify(problem.errors)).toContain('ev_00012');
  });

  it('accepts a sequence gap and reports it as a warning', async () => {
    const res = await ingest(batchOf(FX, events(20, 20)));
    expect(res.status).toBe(202);
    const body = (await res.json()) as IngestBatchResponse;
    expect(body.accepted).toBe(1);
    expect(body.warnings?.[0]).toContain('ev_00020');
  });

  it('pages events by sequence with a bounded limit', async () => {
    const page1 = await jsonOf<EventPage>(
      await fetch(`${t.baseUrl}/fixtures/${FX}/events?limit=3`),
    );
    expect(page1.items.map((e) => e.sequence)).toEqual([0, 1, 2]);
    expect(page1.nextAfterSequence).toBe(2);
    const page2 = await jsonOf<EventPage>(
      await fetch(
        `${t.baseUrl}/fixtures/${FX}/events?afterSequence=2&limit=500`,
      ),
    );
    expect(page2.items.map((e) => e.sequence)).toEqual([3, 4, 10, 11, 20]);
    expect(page2.nextAfterSequence).toBeNull();
    expect(
      (await fetch(`${t.baseUrl}/fixtures/${FX}/events?limit=501`)).status,
    ).toBe(422);
  });
});

import { operatorKeyPrincipal } from '@matchiq/access';
import type { StreamMessage } from '@matchiq/contracts';
import type {
  HashedEvent,
  LedgerTransaction,
  StoredEventRef,
  StreamMessageDraft,
  UnitOfWork,
} from '@matchiq/db';
import { buildTestEvent } from '@matchiq/db/testing';
import { ProblemException } from '@matchiq/server-kit';
import { IngestService } from './ingest.service';

const FX = 'fx_unit';
const key = { orgId: 'org_demo', fixtureId: FX };
const principal = operatorKeyPrincipal('org_demo');
const NOW = new Date('2026-10-21T12:00:00.000Z');

class FakeLedger implements Partial<LedgerTransaction> {
  fixtureExists = true;
  stored: StoredEventRef[] = [];
  inserted: HashedEvent[] = [];
  drafts: StreamMessageDraft[] = [];
  audits = 0;

  lockFixture = async () => this.fixtureExists;
  findEventRefs = async () => this.stored;
  insertEvents = async (
    _k: unknown,
    _id: string,
    events: readonly HashedEvent[],
  ) => {
    this.inserted.push(...events);
  };
  appendStreamMessages = async (
    _k: unknown,
    drafts: readonly StreamMessageDraft[],
  ): Promise<StreamMessage[]> => {
    this.drafts.push(...drafts);
    return [];
  };
  appendAudit = async () => {
    this.audits += 1;
    return `audit-${this.audits}`;
  };
}

const setup = () => {
  const ledger = new FakeLedger();
  const uow: UnitOfWork = {
    transaction: (work) => work(ledger as unknown as LedgerTransaction),
  };
  const notify = jest.fn();
  const service = new IngestService(uow, { notify }, { now: () => NOW });
  return { ledger, notify, service };
};

const batch = (sequences: number[], fixtureId = FX) => ({
  schemaVersion: 1 as const,
  fixtureId,
  events: sequences.map((s) => buildTestEvent(fixtureId, s)),
});

const statusOf = async (p: Promise<unknown>): Promise<number> =>
  p.then(
    () => 0,
    (e: unknown) => (e instanceof ProblemException ? e.getStatus() : -1),
  );

describe('IngestService', () => {
  it('writes fresh events and match.event drafts, then nudges the relay', async () => {
    const { ledger, notify, service } = setup();
    const result = await service.ingest({
      key,
      principal,
      batch: batch([2, 1]),
      requestId: 'req-12345678',
    });
    expect(result.status).toBe(202);
    expect(result.body).toMatchObject({ accepted: 2, lastAcceptedSequence: 2 });
    expect(ledger.inserted.map((h) => h.event.sequence)).toEqual([1, 2]);
    expect(ledger.drafts).toEqual([
      expect.objectContaining({
        type: 'match.event',
        emittedAt: NOW.toISOString(),
        traceId: 'req-12345678',
      }),
      expect.anything(),
    ]);
    expect(ledger.audits).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does not nudge the relay when everything was a duplicate', async () => {
    const { ledger, notify, service } = setup();
    const first = await service.ingest({ key, principal, batch: batch([1]) });
    ledger.stored = ledger.inserted.map((h) => ({
      eventId: h.event.eventId,
      sequence: h.event.sequence,
      payloadHash: h.payloadHash,
    }));
    notify.mockClear();
    const again = await service.ingest({ key, principal, batch: batch([1]) });
    expect(first.body.accepted).toBe(1);
    expect(again.body).toMatchObject({ accepted: 0, duplicates: 1 });
    expect(notify).not.toHaveBeenCalled();
  });

  it('rejects events for another fixture before opening a transaction', async () => {
    const { ledger, service } = setup();
    const lock = jest.spyOn(ledger, 'lockFixture');
    expect(
      await statusOf(
        service.ingest({ key, principal, batch: batch([1], 'fx_other') }),
      ),
    ).toBe(422);
    expect(lock).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown fixture', async () => {
    const { ledger, service } = setup();
    ledger.fixtureExists = false;
    expect(
      await statusOf(service.ingest({ key, principal, batch: batch([1]) })),
    ).toBe(404);
  });

  it('answers 409 on conflicts without writing', async () => {
    const { ledger, notify, service } = setup();
    ledger.stored = [
      { eventId: 'ev_00001', sequence: 1, payloadHash: 'f'.repeat(64) },
    ];
    expect(
      await statusOf(service.ingest({ key, principal, batch: batch([1, 2]) })),
    ).toBe(409);
    expect(ledger.inserted).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });
});

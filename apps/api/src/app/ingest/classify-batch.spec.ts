import { buildTestEvent } from '@matchiq/db/testing';
import { sha256Hex, type HashedEvent, type StoredEventRef } from '@matchiq/db';
import { classifyBatch } from './classify-batch';

const FX = 'fx_unit';
const hashed = (
  sequence: number,
  overrides: Parameters<typeof buildTestEvent>[2] = {},
): HashedEvent => {
  const event = buildTestEvent(FX, sequence, overrides);
  return { event, payloadHash: sha256Hex(event) };
};
const stored = (h: HashedEvent): StoredEventRef => ({
  eventId: h.event.eventId,
  sequence: h.event.sequence,
  payloadHash: h.payloadHash,
});

describe('classifyBatch', () => {
  it('treats unseen events as fresh, ordered by sequence', () => {
    const result = classifyBatch([hashed(3), hashed(1), hashed(2)], []);
    expect(result.fresh.map((h) => h.event.sequence)).toEqual([1, 2, 3]);
    expect(result).toMatchObject({ duplicates: 0, conflicts: [] });
  });

  it('counts exact re-submissions as duplicates', () => {
    const a = hashed(1);
    const result = classifyBatch([a, hashed(2)], [stored(a)]);
    expect(result.duplicates).toBe(1);
    expect(result.fresh.map((h) => h.event.sequence)).toEqual([2]);
  });

  it('flags a stored eventId with a different body', () => {
    const original = hashed(1);
    const changed = hashed(1, { matchClockMs: 5 });
    const result = classifyBatch([changed], [stored(original)]);
    expect(result.conflicts).toEqual([
      {
        path: '$.events.0',
        message: expect.stringContaining('different body'),
      },
    ]);
  });

  it('flags a sequence held by a different stored event', () => {
    const holder = hashed(4);
    const intruder = hashed(4, { eventId: 'ev_intruder' });
    const result = classifyBatch([intruder], [stored(holder)]);
    expect(result.conflicts[0]?.message).toContain('sequence already holds');
  });

  it('collapses identical repeats inside a batch and flags inconsistent ones', () => {
    const same = classifyBatch([hashed(1), hashed(1)], []);
    expect(same).toMatchObject({ duplicates: 1, conflicts: [] });
    expect(same.fresh).toHaveLength(1);

    const twins = classifyBatch(
      [
        hashed(1),
        hashed(1, { eventId: 'ev_twin' }),
        hashed(2, { eventId: 'ev_00001' }),
      ],
      [],
    );
    expect(twins.conflicts.map((c) => c.path)).toEqual([
      '$.events.1',
      '$.events.2',
    ]);
  });
});

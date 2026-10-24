import type { MatchEvent } from '@matchiq/contracts';
import {
  type LedgerTail,
  checkBatchOrder,
  findSequenceGaps,
} from '../src/index.js';
import { sampleMatch } from './helpers.js';

const tailOf = (event: MatchEvent): LedgerTail => ({
  sequence: event.sequence,
  type: event.type,
  period: event.period,
  matchClockMs: event.matchClockMs,
});

describe('checkBatchOrder', () => {
  it('accepts a whole generated stream and any continuation from its tail', () => {
    const { events } = sampleMatch();
    expect(checkBatchOrder(events, null)).toEqual([]);
    expect(checkBatchOrder(events.slice(10, 30), tailOf(events[9]))).toEqual(
      [],
    );
  });

  it('flags a clock regression inside a batch and against the stored tail', () => {
    const { events } = sampleMatch();
    const batch = structuredClone(events.slice(10, 14));
    batch[2] = { ...batch[2], matchClockMs: batch[1].matchClockMs - 1 };
    const found = checkBatchOrder(batch, tailOf(events[9]));
    expect(found.map((i) => [i.code, i.eventId])).toContainEqual([
      'CLOCK_REGRESSION',
      batch[2].eventId,
    ]);
    const stale = { ...events[10], matchClockMs: events[9].matchClockMs - 1 };
    expect(checkBatchOrder([stale], tailOf(events[9]))[0]?.code).toBe(
      'CLOCK_REGRESSION',
    );
  });

  it('flags events after MATCH_ENDED and period regressions', () => {
    const { events } = sampleMatch();
    const ended = events[events.length - 1];
    const after = { ...events[5], sequence: ended.sequence + 1 };
    expect(checkBatchOrder([after], tailOf(ended))[0]?.code).toBe(
      'EVENT_AFTER_MATCH_END',
    );
    const secondHalf = events.find((e) => e.period === 2) as MatchEvent;
    const back = { ...events[5], sequence: secondHalf.sequence + 1, period: 1 };
    const codes = checkBatchOrder([back], tailOf(secondHalf)).map(
      (i) => i.code,
    );
    expect(codes).toContain('PERIOD_STRUCTURE');
  });

  it('flags a period opened without PERIOD_STARTED only for adjacent events', () => {
    const { events } = sampleMatch();
    const first = events.find((e) => e.type === 'PASS_ATTEMPTED') as MatchEvent;
    const tail = tailOf(first);
    const jump = {
      ...(events.find(
        (e) => e.period === 2 && e.type === 'PASS_ATTEMPTED',
      ) as MatchEvent),
      sequence: tail.sequence + 1,
    };
    expect(checkBatchOrder([jump], tail)[0]?.code).toBe('PERIOD_STRUCTURE');
    const gapped = { ...jump, sequence: tail.sequence + 5 };
    expect(checkBatchOrder([gapped], tail)).toEqual([]);
  });
});

describe('findSequenceGaps', () => {
  it('reports gaps from the tail and between events, once each', () => {
    const { events } = sampleMatch();
    const batch = [events[12], events[13], events[16]];
    const gaps = findSequenceGaps(batch, tailOf(events[9]));
    expect(gaps.map((g) => g.sequence)).toEqual([12, 16]);
    expect(gaps.every((g) => g.code === 'SEQUENCE_GAP')).toBe(true);
  });

  it('is empty for a contiguous batch and ignores late backfill', () => {
    const { events } = sampleMatch();
    expect(findSequenceGaps(events.slice(0, 5), null)).toEqual([]);
    expect(findSequenceGaps([events[3]], tailOf(events[9]))).toEqual([]);
  });
});

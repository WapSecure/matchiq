import { Insight, MatchSnapshot, type MetricValue } from '@matchiq/contracts';
import fc from 'fast-check';
import {
  applyEvent,
  createInitialState,
  detectKeyMoments,
  project,
  toSnapshot,
} from '../src/index.js';
import { expectedScore, streamArb } from './arbitraries.js';
import { buildFixture } from './builders.js';

const fixture = buildFixture();
const RUNS = { numRuns: 150 };

const COUNT_KEYS = [
  'goals',
  'shots',
  'shotsOnTarget',
  'passesAttempted',
  'passesCompleted',
  'pressures',
  'recoveries',
  'finalThirdEntries',
  'fouls',
  'yellowCards',
  'redCards',
] as const;

const within = (value: MetricValue, min: number, max: number): boolean =>
  value.status === 'unavailable' || (value.value >= min && value.value <= max);

describe('projection properties', () => {
  it('is deterministic: the same input gives the same stateHash', () => {
    fc.assert(
      fc.property(streamArb, (events) => {
        const a = toSnapshot(project(fixture, events));
        const b = toSnapshot(project(fixture, structuredClone(events)));
        expect(b.stateHash).toBe(a.stateHash);
      }),
      RUNS,
    );
  });

  it('one-by-one application in any order, with duplicates, equals in-order batch projection', () => {
    fc.assert(
      fc.property(
        streamArb.chain((events) =>
          fc.tuple(
            fc.constant(events),
            fc.shuffledSubarray(events, { minLength: events.length }),
            fc.subarray(events),
          ),
        ),
        ([events, shuffled, duplicates]) => {
          let state = createInitialState(fixture);
          for (const event of [...shuffled, ...duplicates]) {
            state = applyEvent(state, event);
          }
          expect(toSnapshot(state)).toEqual(
            toSnapshot(project(fixture, events)),
          );
        },
      ),
      RUNS,
    );
  });

  it('keeps score equal to the count of non-voided goals', () => {
    fc.assert(
      fc.property(streamArb, (events) => {
        expect(toSnapshot(project(fixture, events)).score).toEqual(
          expectedScore(events),
        );
      }),
      RUNS,
    );
  });

  it('never produces negative counts or out-of-range percentages and indices', () => {
    fc.assert(
      fc.property(streamArb, (events) => {
        const snapshot = MatchSnapshot.parse(
          toSnapshot(project(fixture, events)),
        );
        for (const team of [snapshot.home, snapshot.away]) {
          for (const key of COUNT_KEYS)
            expect(team[key]).toBeGreaterThanOrEqual(0);
          expect(team.passesCompleted).toBeLessThanOrEqual(
            team.passesAttempted,
          );
          expect(team.shotsOnTarget).toBeLessThanOrEqual(team.shots);
          expect(within(team.passCompletionPct, 0, 100)).toBe(true);
          expect(within(team.possessionPct, 0, 100)).toBe(true);
          expect(within(team.momentum, -3, 3)).toBe(true);
        }
        expect(snapshot.provisional).toBe(false);
      }),
      RUNS,
    );
  });

  it('produces contract-valid, deterministic, order-independent insights', () => {
    fc.assert(
      fc.property(
        streamArb.chain((events) =>
          fc.tuple(
            fc.constant(events),
            fc.shuffledSubarray(events, { minLength: events.length }),
          ),
        ),
        ([events, shuffled]) => {
          const insights = detectKeyMoments(project(fixture, events));
          for (const insight of insights) Insight.parse(insight);
          expect(detectKeyMoments(project(fixture, shuffled))).toEqual(
            insights,
          );
        },
      ),
      { numRuns: 60 },
    );
  });
});

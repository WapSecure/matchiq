import type { MatchEvent } from '@matchiq/contracts';
import { generateMatch } from '@matchiq/synthetic-data';
import {
  ManualScheduler,
  ReplayController,
  type ReplaySignal,
  type ReplayTiming,
} from '../src/index.js';

let cached: MatchEvent[] | undefined;

export const matchEvents = (): MatchEvent[] => {
  cached ??= generateMatch({ seed: 42, scenario: 'comeback' }).events;
  return cached;
};

/** A short stream with hand-picked clocks: gaps of 1s, 2s, 57s, then a period change. */
export const timedEvents = (): MatchEvent[] => {
  const clocks: [number, number][] = [
    [1, 0],
    [1, 1_000],
    [1, 3_000],
    [1, 60_000],
    [2, 0],
  ];
  return matchEvents()
    .slice(0, clocks.length)
    .map((event, i) => {
      const [period, matchClockMs] = clocks[i] ?? [1, 0];
      return { ...event, period, matchClockMs };
    });
};

/** Consumer that honours resets by rebuilding its log from the ledger up to `appliedSequence`, as a projector would. */
export class Recorder {
  readonly signals: ReplaySignal[] = [];
  readonly applied: number[] = [];
  readonly emittedAt: number[] = [];
  completed = 0;

  constructor(private readonly scheduler: ManualScheduler) {}

  readonly listen = (signal: ReplaySignal): void => {
    this.signals.push(signal);
    if (signal.kind === 'event') {
      this.applied.push(signal.event.sequence);
      this.emittedAt.push(this.scheduler.now());
    } else if (signal.kind === 'reset') {
      this.applied.splice(
        0,
        this.applied.length,
        ...range(signal.appliedSequence + 1),
      );
    } else {
      this.completed += 1;
    }
  };
}

export const setup = (
  events: MatchEvent[] = matchEvents(),
  timing?: Partial<ReplayTiming>,
) => {
  const scheduler = new ManualScheduler();
  const recorder = new Recorder(scheduler);
  const first = events[0];
  if (first === undefined) throw new Error('empty stream');
  const created = ReplayController.create({
    fixtureId: first.fixtureId,
    events,
    scheduler,
    onSignal: recorder.listen,
    ...(timing === undefined ? {} : { timing }),
  });
  if (!created.ok) throw new Error(created.error.message);
  return { scheduler, recorder, controller: created.controller, events };
};

export const range = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i);

import { REPLAY_SPEEDS } from '@matchiq/contracts';
import fc from 'fast-check';
import { ManualScheduler, ReplayController } from '../src/index.js';
import { matchEvents, range, setup, timedEvents } from './helpers.js';

describe('ReplayController', () => {
  it('starts IDLE and emits every event once, in order, then COMPLETED', () => {
    const { controller, recorder, scheduler, events } = setup();
    expect(controller.status).toMatchObject({
      state: 'IDLE',
      appliedSequence: -1,
      period: null,
    });
    expect(controller.execute({ action: 'start', speed: 30 }).ok).toBe(true);
    scheduler.runAll();
    expect(recorder.applied).toEqual(range(events.length));
    expect(recorder.completed).toBe(1);
    expect(recorder.signals.at(-1)).toEqual({ kind: 'completed' });
    const last = events.at(-1);
    expect(controller.status).toEqual({
      fixtureId: last?.fixtureId,
      state: 'COMPLETED',
      speed: 30,
      appliedSequence: events.length - 1,
      period: last?.period,
      matchClockMs: last?.matchClockMs,
    });
  });

  it('paces by match-clock gaps divided by speed, capping dead time and period breaks', () => {
    const { controller, recorder, scheduler } = setup(timedEvents());
    controller.execute({ action: 'start', speed: 1 });
    scheduler.runAll();
    expect(recorder.emittedAt).toEqual([0, 1_000, 3_000, 8_000, 11_000]);

    const fast = setup(timedEvents());
    fast.controller.execute({ action: 'start', speed: 20 });
    fast.scheduler.runAll();
    expect(fast.recorder.emittedAt).toEqual([0, 50, 150, 400, 550]);
  });

  it('honours custom timing', () => {
    const { controller, recorder, scheduler } = setup(timedEvents(), {
      maxGapMs: 60_000,
      periodBreakMs: 0,
    });
    controller.execute({ action: 'start', speed: 5 });
    scheduler.runAll();
    expect(recorder.emittedAt).toEqual([0, 200, 600, 12_000, 12_000]);
  });

  it('pause and resume neither re-emit nor skip, and keep the remaining delay', () => {
    const { controller, recorder, scheduler } = setup(timedEvents());
    controller.execute({ action: 'start', speed: 1 });
    scheduler.advance(1_500);
    expect(recorder.applied).toEqual([0, 1]);
    expect(controller.execute({ action: 'pause' }).ok).toBe(true);
    scheduler.advance(100_000);
    expect(recorder.applied).toEqual([0, 1]);
    expect(controller.status).toMatchObject({
      state: 'PAUSED',
      appliedSequence: 1,
      matchClockMs: 1_000,
    });
    controller.execute({ action: 'resume' });
    scheduler.advance(1_499);
    expect(recorder.applied).toEqual([0, 1]);
    scheduler.advance(1);
    expect(recorder.applied).toEqual([0, 1, 2]);
  });

  it('rescales the pending delay when the speed changes mid-gap', () => {
    const { controller, recorder, scheduler } = setup(timedEvents());
    controller.execute({ action: 'start', speed: 1 });
    scheduler.advance(2_000);
    controller.execute({ action: 'setSpeed', speed: 20 });
    scheduler.advance(49);
    expect(recorder.applied).toEqual([0, 1]);
    scheduler.advance(1);
    expect(recorder.applied).toEqual([0, 1, 2]);
    expect(controller.status.speed).toBe(20);
    controller.execute({ action: 'pause' });
    controller.execute({ action: 'setSpeed', speed: 5 });
    controller.execute({ action: 'resume' });
    scheduler.advance(999);
    expect(recorder.applied).toHaveLength(3);
    scheduler.advance(1);
    expect(recorder.applied).toHaveLength(4);
  });

  it('seek emits a reset and continues from the requested sequence', () => {
    const { controller, recorder, scheduler, events } = setup();
    controller.execute({ action: 'start', speed: 30 });
    scheduler.advance(10_000);
    const result = controller.execute({ action: 'seek', sequence: 3 });
    expect(result.ok && result.status).toMatchObject({
      state: 'PLAYING',
      appliedSequence: 2,
    });
    expect(recorder.signals.find((s) => s.kind === 'reset')).toEqual({
      kind: 'reset',
      appliedSequence: 2,
      nextSequence: 3,
    });
    scheduler.runAll();
    expect(recorder.applied).toEqual(range(events.length));
  });

  it('seek while paused or completed leaves the replay paused at that point', () => {
    const { controller, recorder, scheduler, events } = setup();
    controller.execute({ action: 'start', speed: 30 });
    scheduler.runAll();
    const seek = controller.execute({
      action: 'seek',
      sequence: events.length - 2,
    });
    expect(seek.ok && seek.status.state).toBe('PAUSED');
    scheduler.runAll();
    expect(recorder.applied).toHaveLength(events.length - 2);
    controller.execute({ action: 'resume' });
    scheduler.runAll();
    expect(recorder.applied).toEqual(range(events.length));
    expect(recorder.completed).toBe(2);
  });

  it('returns typed errors for invalid transitions and commands', () => {
    const { controller, scheduler, events } = setup();
    const expectError = (
      result: ReturnType<typeof controller.execute>,
      code: string,
      state?: string,
    ) => {
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error).toMatchObject({
          code,
          ...(state ? { state } : {}),
        });
    };
    expectError(
      controller.execute({ action: 'pause' }),
      'INVALID_TRANSITION',
      'IDLE',
    );
    expectError(
      controller.execute({ action: 'resume' }),
      'INVALID_TRANSITION',
      'IDLE',
    );
    controller.execute({ action: 'start', speed: 1 });
    expectError(
      controller.execute({ action: 'start', speed: 1 }),
      'INVALID_TRANSITION',
      'PLAYING',
    );
    expectError(
      controller.execute({ action: 'resume' }),
      'INVALID_TRANSITION',
      'PLAYING',
    );
    expectError(
      controller.execute({ action: 'seek', sequence: events.length }),
      'SEEK_OUT_OF_RANGE',
    );
    expectError(
      controller.executeUnknown({ action: 'setSpeed', speed: 2 }),
      'INVALID_COMMAND',
    );
    expectError(
      controller.executeUnknown({ action: 'rewind' }),
      'INVALID_COMMAND',
    );
    controller.execute({ action: 'pause' });
    expectError(
      controller.execute({ action: 'pause' }),
      'INVALID_TRANSITION',
      'PAUSED',
    );
    controller.execute({ action: 'resume' });
    scheduler.runAll();
    expectError(
      controller.execute({ action: 'pause' }),
      'INVALID_TRANSITION',
      'COMPLETED',
    );
    expect(controller.executeUnknown({ action: 'setSpeed', speed: 5 }).ok).toBe(
      true,
    );
  });

  it('rejects streams that are empty, gapped or mixed', () => {
    const events = matchEvents();
    const base = {
      scheduler: new ManualScheduler(),
      onSignal: () => undefined,
    };
    const fixtureId = events[0]?.fixtureId ?? 'fx_none';
    expect(ReplayController.create({ ...base, fixtureId, events: [] }).ok).toBe(
      false,
    );
    expect(
      ReplayController.create({ ...base, fixtureId, events: events.slice(1) })
        .ok,
    ).toBe(false);
    expect(
      ReplayController.create({ ...base, fixtureId: 'fx_other', events }).ok,
    ).toBe(false);
  });

  it('tolerates listeners that issue commands re-entrantly', () => {
    const scheduler = new ManualScheduler();
    const events = matchEvents();
    const seen: number[] = [];
    const ref: { controller?: ReplayController } = {};
    let sought = false;
    const created = ReplayController.create({
      fixtureId: events[0]?.fixtureId ?? 'fx_none',
      events,
      scheduler,
      onSignal: (signal) => {
        if (signal.kind !== 'event') return;
        seen.push(signal.event.sequence);
        if (signal.event.sequence === 1)
          ref.controller?.execute({ action: 'pause' });
        if (signal.event.sequence === 5 && !sought) {
          sought = true;
          ref.controller?.execute({ action: 'seek', sequence: 2 });
        }
      },
    });
    if (!created.ok) throw new Error(created.error.message);
    const controller = created.controller;
    ref.controller = controller;
    controller.execute({ action: 'start', speed: 30 });
    scheduler.runAll();
    expect(seen).toEqual([0, 1]);
    controller.execute({ action: 'resume' });
    scheduler.runAll();
    expect(seen.slice(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 2]);
    expect(seen.at(-1)).toBe(events.length - 1);
  });

  it('dispose stops all further emission', () => {
    const { controller, recorder, scheduler } = setup();
    controller.execute({ action: 'start', speed: 1 });
    scheduler.advance(1);
    const count = recorder.applied.length;
    controller.dispose();
    scheduler.runAll();
    expect(recorder.applied).toHaveLength(count);
  });
});

describe('ReplayController properties', () => {
  type Step =
    | { kind: 'advance'; ms: number }
    | { kind: 'pause' }
    | { kind: 'resume' }
    | { kind: 'speed'; speed: (typeof REPLAY_SPEEDS)[number] }
    | { kind: 'seek'; fraction: number };

  const stepArb: fc.Arbitrary<Step> = fc.oneof(
    fc.record({
      kind: fc.constant('advance' as const),
      ms: fc.integer({ min: 0, max: 20_000 }),
    }),
    fc.constant({ kind: 'pause' as const }),
    fc.constant({ kind: 'resume' as const }),
    fc.record({
      kind: fc.constant('speed' as const),
      speed: fc.constantFrom(...REPLAY_SPEEDS),
    }),
    fc.record({
      kind: fc.constant('seek' as const),
      fraction: fc.double({ min: 0, max: 1, noNaN: true }),
    }),
  );

  it('any command interleaving ends with every sequence applied exactly once, in order', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...REPLAY_SPEEDS),
        fc.array(stepArb, { maxLength: 40 }),
        (speed, steps) => {
          const { controller, recorder, scheduler, events } = setup();
          controller.execute({ action: 'start', speed });
          for (const step of steps) {
            if (step.kind === 'advance') scheduler.advance(step.ms);
            else if (step.kind === 'speed')
              controller.execute({ action: 'setSpeed', speed: step.speed });
            else if (step.kind === 'seek') {
              controller.execute({
                action: 'seek',
                sequence: Math.floor(step.fraction * (events.length - 1)),
              });
            } else controller.execute({ action: step.kind });
            const applied = recorder.applied;
            expect(applied).toEqual(range(applied.length));
            expect(controller.status.appliedSequence).toBe(applied.length - 1);
          }
          if (controller.status.state === 'PAUSED')
            controller.execute({ action: 'resume' });
          scheduler.runAll();
          expect(recorder.applied).toEqual(range(events.length));
          expect(controller.status.state).toBe('COMPLETED');
        },
      ),
      { numRuns: 60 },
    );
  });

  it('1x and 30x replays emit identical event sequences (golden replay protocol)', () => {
    const run = (speed: (typeof REPLAY_SPEEDS)[number]) => {
      const { controller, recorder, scheduler } = setup();
      controller.execute({ action: 'start', speed });
      scheduler.runAll();
      return { signals: recorder.signals, duration: scheduler.now() };
    };
    const slow = run(1);
    const fast = run(30);
    expect(fast.signals).toEqual(slow.signals);
    expect(Math.abs(fast.duration * 30 - slow.duration)).toBeLessThan(1);
  });
});

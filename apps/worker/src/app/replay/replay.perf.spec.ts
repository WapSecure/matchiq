import type { MatchEvent } from '@matchiq/contracts';
import { PostgresPipelineUnitOfWork, type FixtureKey } from '@matchiq/db';
import {
  createSystemScheduler,
  ManualScheduler,
  realDelayMs,
  REPLAY_TIMING,
  type Scheduler,
} from '@matchiq/replay';
import { loadGolden } from '../../test/golden';
import { ORG, startTestWorker, type TestWorker } from '../../test/test-worker';
import { MatchPipeline } from '../pipeline/match-pipeline';
import type { PipelineBatch } from '../pipeline/pipeline-batch';
import { PipelineWriter } from './pipeline-writer';
import { rebaseEvents } from './session-loader';
import { SessionRunner } from './session-runner';

jest.setTimeout(120_000);

/** Spec §33/§52 smoke: generous bounds so CI stays green, real numbers printed with PERF_REPORT=1. */
const BOUNDS = { minEventsPerSecond: 100, maxP95LatencyMs: 1_500 };
const WINDOW_MS = 8_000;
const SPEED = 30;

const percentile = (values: readonly number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0
  );
};

interface Harness {
  readonly runner: SessionRunner;
  /** Commit times of batches carrying a snapshot, and of every ledger write. */
  readonly commits: { at: number; through: number }[];
  readonly writes: { at: number; through: number }[];
  readonly events: MatchEvent[];
}

const harness = async (
  t: TestWorker,
  scheduler: Scheduler,
): Promise<Harness> => {
  const created = await t.store.create({
    orgId: ORG,
    templateId: 'fx_comeback_42',
    speed: SPEED,
  });
  if (created === null) throw new Error('no session');
  const key: FixtureKey = { orgId: ORG, fixtureId: created.fixture.fixtureId };
  const golden = await loadGolden('comeback');
  const events = rebaseEvents(golden.events, key.fixtureId);
  const commits: Harness['commits'] = [];
  const writes: Harness['writes'] = [];
  const runner = new SessionRunner({
    key,
    events,
    pipeline: new MatchPipeline({
      fixture: created.fixture,
      aiEnabled: false,
      now: () => new Date().toISOString(),
    }),
    writer: new PipelineWriter(new PostgresPipelineUnitOfWork(t.db.db)),
    scheduler,
    hooks: {
      afterWrite: async (_key, batch: PipelineBatch) => {
        const at = performance.now();
        const last = batch.events.at(-1);
        if (last) writes.push({ at, through: last.sequence });
        if (batch.snapshot) {
          commits.push({ at, through: batch.snapshot.throughSequence });
        }
      },
      onFailure: (_key, error) => {
        throw error;
      },
      onHookError: () => undefined,
    },
  });
  return { runner, commits, writes, events };
};

describe('replay performance', () => {
  let t: TestWorker;

  beforeAll(async () => {
    t = await startTestWorker();
  });

  afterAll(() => t.close());

  it('replays comeback at maximum speed above the throughput floor', async () => {
    const scheduler = new ManualScheduler();
    const { runner, events } = await harness(t, scheduler);
    const started = performance.now();
    runner.command({ action: 'start', speed: SPEED });
    scheduler.runAll();
    await runner.whenIdle();
    const seconds = (performance.now() - started) / 1_000;
    const eventsPerSecond = events.length / seconds;
    if (process.env['PERF_REPORT']) {
      console.warn(
        `max-speed replay: ${events.length} events in ${seconds.toFixed(2)} s = ${eventsPerSecond.toFixed(0)} events/s`,
      );
    }
    expect(eventsPerSecond).toBeGreaterThan(BOUNDS.minEventsPerSecond);
  });

  it(`keeps p95 event-to-snapshot latency bounded at ${SPEED}x in real time`, async () => {
    const { runner, commits, writes, events } = await harness(
      t,
      createSystemScheduler(),
    );
    const t0 = performance.now();
    runner.command({ action: 'start', speed: SPEED });
    await new Promise((r) => setTimeout(r, WINDOW_MS));
    runner.dispose();
    await runner.whenIdle();
    const timing = { timing: { ...REPLAY_TIMING }, speed: SPEED } as const;
    let due = t0;
    const latencies: number[] = [];
    const ingest: number[] = [];
    for (const [i, event] of events.entries()) {
      due += realDelayMs(events[i - 1], event, timing);
      const commit = commits.find((c) => c.through >= event.sequence);
      const write = writes.find((c) => c.through >= event.sequence);
      if (commit === undefined || write === undefined) break;
      latencies.push(Math.max(0, commit.at - due));
      ingest.push(Math.max(0, write.at - due));
    }
    const p95 = percentile(latencies, 0.95);
    if (process.env['PERF_REPORT']) {
      const ms = (v: number) => `${v.toFixed(1)} ms`;
      console.warn(
        `${SPEED}x real-time: ${latencies.length} events in ${WINDOW_MS} ms; ` +
          `event-to-ledger p50 ${ms(percentile(ingest, 0.5))} p95 ${ms(percentile(ingest, 0.95))}; ` +
          `event-to-snapshot p50 ${ms(percentile(latencies, 0.5))} p95 ${ms(p95)}`,
      );
    }
    expect(latencies.length).toBeGreaterThan(20);
    expect(p95).toBeLessThan(BOUNDS.maxP95LatencyMs);
  });
});

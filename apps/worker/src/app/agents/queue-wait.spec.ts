import { Registry } from '@matchiq/server-kit';
import type { Publication } from '../pipeline/publication';
import { WORKER_METRICS } from '../telemetry/telemetry.constants';
import { WorkerMetrics } from '../telemetry/worker-metrics';
import { firstAttemptWaitMs, withQueueWait } from './queue-wait';

const publication = {
  narratives: [],
  runs: [],
  overlay: null,
  completion: {
    status: 'PUBLISHED',
    gateReport: {
      source: 'AGENT',
      publishedNarratives: 12,
      templateNarratives: 0,
      overlayRevision: null,
      rejected: [],
    },
  },
} as Publication;

describe('firstAttemptWaitMs', () => {
  it('is the time from enqueue to the first attempt starting', () => {
    expect(
      firstAttemptWaitMs({
        timestamp: 1_000,
        processedOn: 25_400,
        attemptsMade: 0,
      }),
    ).toBe(24_400);
  });

  it('is unknown for retries, which would count backoff as waiting', () => {
    expect(
      firstAttemptWaitMs({
        timestamp: 1_000,
        processedOn: 25_400,
        attemptsMade: 1,
      }),
    ).toBeNull();
  });

  it('is unknown without a start time and never negative', () => {
    expect(firstAttemptWaitMs({ timestamp: 1, attemptsMade: 0 })).toBeNull();
    expect(
      firstAttemptWaitMs({ timestamp: 500, processedOn: 400, attemptsMade: 0 }),
    ).toBe(0);
  });
});

describe('withQueueWait', () => {
  it('stores the wait on the gate report', () => {
    expect(
      withQueueWait(publication, 3_000).completion.gateReport.queueWaitMs,
    ).toBe(3_000);
  });

  it('leaves the publication untouched when the wait is unknown', () => {
    expect(withQueueWait(publication, undefined)).toBe(publication);
  });
});

describe('queue wait metric', () => {
  it('registers the histogram and records a wait in seconds', async () => {
    const registry = new Registry();
    new WorkerMetrics(registry).queueWaited(24.4);
    const text = await registry.metrics();
    expect(WORKER_METRICS.names.queueWait).toBe(
      'matchiq_agent_queue_wait_seconds',
    );
    expect(text).toContain('matchiq_agent_queue_wait_seconds_count 1');
    expect(text).toContain('matchiq_agent_queue_wait_seconds_sum 24.4');
  });
});

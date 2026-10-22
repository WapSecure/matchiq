import { FixtureId, InsightId, OrgId, ReplayCommand } from '@matchiq/contracts';
import { Queue, type ConnectionOptions, type Telemetry } from 'bullmq';
import { z } from 'zod';
import {
  JOB_ID_SEPARATOR,
  JOB_NAMES,
  QUEUE_RETENTION,
  QUEUES,
} from '../constants.js';

/** API → worker: one replay control command for a session. */
export const ReplayCommandJob = z.strictObject({
  orgId: OrgId,
  fixtureId: FixtureId,
  command: ReplayCommand,
});

/** Worker → worker: run the agents pipeline for one insight revision. */
export const InsightPipelineJob = z.strictObject({
  orgId: OrgId,
  fixtureId: FixtureId,
  insightId: InsightId,
  revision: z.int().positive(),
});

export type ReplayCommandJob = z.infer<typeof ReplayCommandJob>;
export type InsightPipelineJob = z.infer<typeof InsightPipelineJob>;

export interface ReplayCommandBus {
  send(job: ReplayCommandJob): Promise<void>;
}

export interface InsightJobQueue {
  enqueue(job: InsightPipelineJob): Promise<void>;
}

export interface JobRetryPolicy {
  readonly attempts: number;
  readonly backoffMs: number;
}

/** The idempotency key of a pipeline job; a duplicate enqueue is a no-op in BullMQ. */
export const insightJobId = (job: InsightPipelineJob): string =>
  [job.fixtureId, job.insightId, String(job.revision)].join(JOB_ID_SEPARATOR);

export interface QueueConnection {
  readonly connection: ConnectionOptions;
  /** BullMQ key prefix; reuse REDIS_KEY_PREFIX so environments stay apart. */
  readonly prefix: string;
  /** Set when tracing is on: producer and consumer spans carry W3C context in job options. */
  readonly telemetry?: Telemetry;
}

const retention = {
  removeOnComplete: QUEUE_RETENTION.completedCount,
  removeOnFail: QUEUE_RETENTION.failedCount,
};

export class BullMqReplayCommandBus implements ReplayCommandBus {
  private readonly queue: Queue;

  constructor(options: QueueConnection) {
    this.queue = new Queue(QUEUES.replayCommands, options);
  }

  async send(job: ReplayCommandJob): Promise<void> {
    await this.queue.add(JOB_NAMES.replayCommand, ReplayCommandJob.parse(job), {
      ...retention,
    });
  }

  close(): Promise<void> {
    return this.queue.close();
  }
}

export class BullMqInsightJobQueue implements InsightJobQueue {
  private readonly queue: Queue;

  constructor(
    options: QueueConnection,
    private readonly retry: JobRetryPolicy,
  ) {
    this.queue = new Queue(QUEUES.insightPipeline, options);
  }

  async enqueue(job: InsightPipelineJob): Promise<void> {
    await this.queue.add(
      JOB_NAMES.insightPipeline,
      InsightPipelineJob.parse(job),
      {
        jobId: insightJobId(job),
        attempts: this.retry.attempts,
        backoff: { type: 'exponential', delay: this.retry.backoffMs },
        ...retention,
      },
    );
  }

  close(): Promise<void> {
    return this.queue.close();
  }
}

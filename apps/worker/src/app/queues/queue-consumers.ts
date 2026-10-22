import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { InsightPipelineJob, QUEUES, ReplayCommandJob } from '@matchiq/db';
import { withLogContext } from '@matchiq/server-kit';
import { Worker, type Job } from 'bullmq';
import { InsightPipelineService } from '../agents/insight-pipeline.service';
import { LOG_MESSAGES } from '../constants';
import { REDIS } from '../infrastructure/tokens';
import type { WorkerRedis } from '../infrastructure/redis-connections';
import { SessionManager } from '../replay/session-manager.service';
import type { WorkerMetrics } from '../telemetry/worker-metrics';

export const QUEUE_CONSUMERS = Symbol('QUEUE_CONSUMERS');

export interface QueueConsumerConfig {
  /** False in tests that drive sessions directly. */
  readonly enabled: boolean;
  readonly insightConcurrency: number;
  readonly metrics: WorkerMetrics;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Log lines written while a job runs carry its queue, id, org and fixture. */
const inJobContext =
  <T>(handle: (job: Job) => Promise<T>) =>
  (job: Job): Promise<T> => {
    const data = job.data as { orgId?: string; fixtureId?: string };
    return withLogContext(
      {
        queue: job.queueName,
        jobId: job.id,
        orgId: data.orgId,
        fixtureId: data.fixtureId,
      },
      () => handle(job),
    );
  };

const runSeconds = (job: Job | undefined): number | null =>
  job?.processedOn && job.finishedOn
    ? (job.finishedOn - job.processedOn) / 1_000
    : null;

/**
 * BullMQ consumers: replay commands one at a time (so a session sees them in
 * order) and agents-pipeline jobs with bounded concurrency.
 */
@Injectable()
export class QueueConsumers
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(QueueConsumers.name);
  private workers: Worker[] = [];

  constructor(
    @Inject(QUEUE_CONSUMERS) private readonly config: QueueConsumerConfig,
    @Inject(REDIS) private readonly redis: WorkerRedis,
    private readonly sessions: SessionManager,
    private readonly pipeline: InsightPipelineService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.enabled) return;
    const options = { ...this.redis.queues };
    const commands = new Worker(
      QUEUES.replayCommands,
      inJobContext((job) =>
        this.sessions.handle(ReplayCommandJob.parse(job.data)),
      ),
      { ...options, concurrency: 1 },
    );
    const insights = new Worker(
      QUEUES.insightPipeline,
      inJobContext((job) =>
        this.pipeline.process(InsightPipelineJob.parse(job.data), {
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 1,
        }),
      ),
      { ...options, concurrency: this.config.insightConcurrency },
    );
    for (const worker of [commands, insights]) {
      this.observe(worker);
      worker.on('failed', (job, error) =>
        this.logger.warn(
          LOG_MESSAGES.jobFailed(job?.id ?? '?', describe(error)),
        ),
      );
      worker.on('error', (error) => this.logger.warn(describe(error)));
    }
    this.workers = [commands, insights];
  }

  private observe(worker: Worker): void {
    const { metrics } = this.config;
    worker.on('completed', (job) => {
      const seconds = runSeconds(job);
      if (seconds !== null) metrics.job(worker.name, 'completed', seconds);
    });
    worker.on('failed', (job) => {
      const seconds = runSeconds(job);
      if (seconds !== null) metrics.job(worker.name, 'failed', seconds);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.workers.map((w) => w.close()));
    this.workers = [];
  }
}

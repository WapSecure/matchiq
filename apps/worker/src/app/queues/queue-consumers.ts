import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { InsightPipelineJob, QUEUES, ReplayCommandJob } from '@matchiq/db';
import { Worker, type Job } from 'bullmq';
import { InsightPipelineService } from '../agents/insight-pipeline.service';
import { LOG_MESSAGES } from '../constants';
import { REDIS } from '../infrastructure/tokens';
import type { WorkerRedis } from '../infrastructure/redis-connections';
import { SessionManager } from '../replay/session-manager.service';

export const QUEUE_CONSUMERS = Symbol('QUEUE_CONSUMERS');

export interface QueueConsumerConfig {
  /** False in tests that drive sessions directly. */
  readonly enabled: boolean;
  readonly insightConcurrency: number;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
      (job: Job) => this.sessions.handle(ReplayCommandJob.parse(job.data)),
      { ...options, concurrency: 1 },
    );
    const insights = new Worker(
      QUEUES.insightPipeline,
      (job: Job) =>
        this.pipeline.process(InsightPipelineJob.parse(job.data), {
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 1,
        }),
      { ...options, concurrency: this.config.insightConcurrency },
    );
    for (const worker of [commands, insights]) {
      worker.on('failed', (job, error) =>
        this.logger.warn(
          LOG_MESSAGES.jobFailed(job?.id ?? '?', describe(error)),
        ),
      );
      worker.on('error', (error) => this.logger.warn(describe(error)));
    }
    this.workers = [commands, insights];
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.workers.map((w) => w.close()));
    this.workers = [];
  }
}

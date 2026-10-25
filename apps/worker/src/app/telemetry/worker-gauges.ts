import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { type DatabaseHandle, PostgresOutboxStore, QUEUES } from '@matchiq/db';
import { Gauge, METRICS_REGISTRY, type Registry } from '@matchiq/server-kit';
import { Queue } from 'bullmq';
import { DATABASE, REDIS } from '../infrastructure/tokens';
import type { WorkerRedis } from '../infrastructure/redis-connections';
import { SessionManager } from '../replay/session-manager.service';
import { WORKER_METRICS } from './telemetry.constants';

const { names, help, queueStates } = WORKER_METRICS;

/** A failed read keeps the last value: a scrape must not fail with Redis or Postgres. */
const tolerant = async (read: () => Promise<void>): Promise<void> => {
  try {
    await read();
  } catch {
    // The dependency's own health check reports the outage.
  }
};

/**
 * Gauges read at scrape time: replay sessions by state, BullMQ depth per
 * queue and state, and the outbox backlog and its oldest row's age.
 */
@Injectable()
export class WorkerGauges implements OnModuleInit, OnApplicationShutdown {
  private queues: Queue[] = [];

  constructor(
    @Inject(METRICS_REGISTRY) private readonly registry: Registry,
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(REDIS) private readonly redis: WorkerRedis,
    private readonly sessions: SessionManager,
  ) {}

  onModuleInit(): void {
    const { connection, prefix } = this.redis.queues;
    this.queues = Object.values(QUEUES).map(
      (name) => new Queue(name, { connection, prefix }),
    );
    this.sessionGauge();
    this.queueGauge(this.queues);
    this.outboxGauges(new PostgresOutboxStore(this.database.db));
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.queues.map((q) => q.close()));
  }

  private sessionGauge(): void {
    const sessions = this.sessions;
    new Gauge({
      name: names.sessions,
      help: help.sessions,
      labelNames: ['state'],
      registers: [this.registry],
      collect() {
        this.reset();
        for (const [state, n] of sessions.sessionStates()) {
          this.set({ state }, n);
        }
      },
    });
  }

  private queueGauge(queues: readonly Queue[]): void {
    new Gauge({
      name: names.queueJobs,
      help: help.queueJobs,
      labelNames: ['queue', 'state'],
      registers: [this.registry],
      async collect() {
        for (const queue of queues) {
          await tolerant(async () => {
            const counts = await queue.getJobCounts(
              ...queueStates,
              'prioritized',
            );
            for (const state of queueStates) {
              const prioritized = state === 'waiting' ? counts.prioritized : 0;
              this.set(
                { queue: queue.name, state },
                (counts[state] ?? 0) + (prioritized ?? 0),
              );
            }
          });
        }
      },
    });
  }

  private outboxGauges(outbox: PostgresOutboxStore): void {
    new Gauge({
      name: names.outboxBacklog,
      help: help.outboxBacklog,
      registers: [this.registry],
      async collect() {
        await tolerant(async () => this.set((await outbox.backlog()).count));
      },
    });
    new Gauge({
      name: names.outboxAge,
      help: help.outboxAge,
      registers: [this.registry],
      async collect() {
        await tolerant(async () =>
          this.set((await outbox.backlog()).oldestAgeSeconds),
        );
      },
    });
  }
}

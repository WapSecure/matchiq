import { Inject, Injectable } from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type { DatabaseHandle } from '@matchiq/db';
import {
  APP_ENV,
  type HealthCheckResult,
  type HealthIndicator,
} from '@matchiq/server-kit';
import type { AgentsClient } from '../agents/agents-client';
import { HEALTH_CHECKS, HEALTH_DETAILS } from '../constants';
import type { WorkerRedis } from './redis-connections';
import { AGENTS_CLIENT, DATABASE, REDIS } from './tokens';

const probe = async (
  check: () => Promise<unknown>,
): Promise<HealthCheckResult> => {
  try {
    await check();
    return { status: 'ok' };
  } catch {
    return { status: 'unavailable', detail: HEALTH_DETAILS.unreachable };
  }
};

@Injectable()
export class PostgresHealthIndicator implements HealthIndicator {
  readonly name = HEALTH_CHECKS.postgres;

  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  check(): Promise<HealthCheckResult> {
    return probe(() => this.database.pool.query('select 1'));
  }
}

@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
  readonly name = HEALTH_CHECKS.redis;

  constructor(@Inject(REDIS) private readonly redis: WorkerRedis) {}

  check(): Promise<HealthCheckResult> {
    return probe(() => this.redis.bus.ping());
  }
}

/** Replay never depends on the model, so an unreachable agents service is degraded, not down. */
@Injectable()
export class AgentsHealthIndicator implements HealthIndicator {
  readonly name = HEALTH_CHECKS.agents;

  constructor(
    @Inject(APP_ENV) private readonly env: WorkerEnv,
    @Inject(AGENTS_CLIENT) private readonly client: AgentsClient,
  ) {}

  async check(): Promise<HealthCheckResult> {
    if (!this.env.AI_ENABLED) {
      return { status: 'ok', detail: HEALTH_DETAILS.aiDisabled };
    }
    return (await this.client.reachable())
      ? { status: 'ok' }
      : { status: 'degraded', detail: HEALTH_DETAILS.agentsDegraded };
  }
}

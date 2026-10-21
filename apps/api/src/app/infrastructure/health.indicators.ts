import { Inject, Injectable } from '@nestjs/common';
import type { DatabaseHandle } from '@matchiq/db';
import type { HealthCheckResult, HealthIndicator } from '@matchiq/server-kit';
import { HEALTH_CHECKS, HEALTH_DETAILS } from '../constants';
import type { RedisConnections } from './redis-connections';
import { DATABASE, REDIS } from './tokens';

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

  constructor(@Inject(REDIS) private readonly redis: RedisConnections) {}

  check(): Promise<HealthCheckResult> {
    return probe(() => this.redis.bus.ping());
  }
}

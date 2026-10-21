import { Inject, Injectable } from '@nestjs/common';
import type { HealthStatus } from '@matchiq/contracts';
import { HEALTH_CHECK_TIMEOUT_MS, PROBLEM_TITLES } from '../constants';
import {
  HEALTH_INDICATORS,
  HEALTH_OPTIONS,
  type HealthCheckResult,
  type HealthIndicator,
  type HealthModuleOptions,
  type HealthState,
} from './health.types';

const SEVERITY: Readonly<Record<HealthState, number>> = {
  ok: 0,
  degraded: 1,
  unavailable: 2,
};

const withTimeout = async (
  indicator: HealthIndicator,
  timeoutMs: number,
): Promise<HealthCheckResult> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<HealthCheckResult>((resolve) => {
    timer = setTimeout(
      () => resolve({ status: 'unavailable', detail: PROBLEM_TITLES.timeout }),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([
      indicator.check().catch((): HealthCheckResult => ({
        status: 'unavailable',
        detail: 'check failed',
      })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
};

@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
    @Inject(HEALTH_INDICATORS) private readonly indicators: HealthIndicator[],
  ) {}

  liveness(): HealthStatus {
    return this.report('ok', {});
  }

  async readiness(timeoutMs = HEALTH_CHECK_TIMEOUT_MS): Promise<HealthStatus> {
    const results = await Promise.all(
      this.indicators.map(
        async (i) => [i.name, await withTimeout(i, timeoutMs)] as const,
      ),
    );
    const checks = Object.fromEntries(results);
    const worst = results.reduce<HealthState>(
      (acc, [, r]) => (SEVERITY[r.status] > SEVERITY[acc] ? r.status : acc),
      'ok',
    );
    return this.report(worst, checks);
  }

  private report(
    status: HealthState,
    checks: HealthStatus['checks'],
  ): HealthStatus {
    return {
      status,
      service: this.options.service,
      version: this.options.version,
      checks,
    };
  }
}

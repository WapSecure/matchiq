import type { HealthStatus } from '@matchiq/contracts';

export type HealthState = HealthStatus['status'];
export type HealthCheckResult = HealthStatus['checks'][string];

export interface HealthIndicator {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}

export interface HealthModuleOptions {
  readonly service: string;
  readonly version: string;
}

export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS');
export const HEALTH_OPTIONS = Symbol('HEALTH_OPTIONS');

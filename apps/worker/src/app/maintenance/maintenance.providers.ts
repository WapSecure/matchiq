import type { Provider } from '@nestjs/common';
import {
  PostgresRetentionStore,
  type DatabaseHandle,
  type FixtureReader,
  type InsightJobQueue,
  type RetentionStore,
} from '@matchiq/db';
import {
  CLOCK,
  type Clock,
  DATABASE,
  FIXTURE_READER,
  INSIGHT_JOB_QUEUE,
} from '../infrastructure/tokens';

export const MAINTENANCE_DEPS = Symbol('MAINTENANCE_DEPS');

export interface MaintenanceDeps {
  readonly store: RetentionStore;
  readonly fixtures: FixtureReader;
  readonly jobs: InsightJobQueue;
  readonly clock: Clock;
}

export const MAINTENANCE_PROVIDERS: Provider[] = [
  {
    provide: MAINTENANCE_DEPS,
    useFactory: (
      database: DatabaseHandle,
      fixtures: FixtureReader,
      jobs: InsightJobQueue,
      clock: Clock,
    ): MaintenanceDeps => ({
      store: new PostgresRetentionStore(database),
      fixtures,
      jobs,
      clock,
    }),
    inject: [DATABASE, FIXTURE_READER, INSIGHT_JOB_QUEUE, CLOCK],
  },
];

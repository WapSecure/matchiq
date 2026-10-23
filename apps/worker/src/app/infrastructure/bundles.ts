import type { Provider } from '@nestjs/common';
import type {
  FixtureReader,
  InsightJobQueue,
  IntelligenceReader,
  PipelineUnitOfWork,
  SessionStore,
  TemplateStore,
} from '@matchiq/db';
import type { Scheduler } from '@matchiq/replay';
import type { AgentsClient } from '../agents/agents-client';
import type { SessionSources } from '../replay/session-loader';
import {
  AGENT_PIPELINE_DEPS,
  AGENTS_CLIENT,
  CLOCK,
  type Clock,
  FIXTURE_READER,
  INSIGHT_JOB_QUEUE,
  INTELLIGENCE_READER,
  OUTBOX_NOTIFIER,
  type OutboxNotifier,
  PIPELINE_UOW,
  REPLAY_SCHEDULER,
  SESSION_RUNTIME,
  SESSION_SOURCES,
  SESSION_STORE,
  TEMPLATE_STORE,
} from './tokens';

/** Collaborators grouped by role so services keep small constructors. */
export interface SessionRuntime {
  readonly scheduler: Scheduler;
  readonly outbox: OutboxNotifier;
  readonly clock: Clock;
  readonly jobs: InsightJobQueue;
}

export interface AgentPipelineDeps {
  readonly client: AgentsClient;
  readonly reader: IntelligenceReader;
  readonly fixtures: FixtureReader;
  readonly clock: Clock;
  /** Read for the session's demo fault plan (ADR-0020). */
  readonly sessions: SessionStore;
}

export const BUNDLE_PROVIDERS: Provider[] = [
  {
    provide: SESSION_SOURCES,
    useFactory: (
      uow: PipelineUnitOfWork,
      sessions: SessionStore,
      templates: TemplateStore,
      fixtures: FixtureReader,
    ): SessionSources => ({ uow, sessions, templates, fixtures }),
    inject: [PIPELINE_UOW, SESSION_STORE, TEMPLATE_STORE, FIXTURE_READER],
  },
  {
    provide: SESSION_RUNTIME,
    useFactory: (
      scheduler: Scheduler,
      outbox: OutboxNotifier,
      clock: Clock,
      jobs: InsightJobQueue,
    ): SessionRuntime => ({ scheduler, outbox, clock, jobs }),
    inject: [REPLAY_SCHEDULER, OUTBOX_NOTIFIER, CLOCK, INSIGHT_JOB_QUEUE],
  },
  {
    provide: AGENT_PIPELINE_DEPS,
    useFactory: (
      client: AgentsClient,
      reader: IntelligenceReader,
      sources: SessionSources,
      clock: Clock,
    ): AgentPipelineDeps => ({
      client,
      reader,
      fixtures: sources.fixtures,
      clock,
      sessions: sources.sessions,
    }),
    inject: [AGENTS_CLIENT, INTELLIGENCE_READER, SESSION_SOURCES, CLOCK],
  },
];

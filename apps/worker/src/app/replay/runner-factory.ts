import type { FixtureKey } from '@matchiq/db';
import type { Scheduler } from '@matchiq/replay';
import { MatchPipeline } from '../pipeline/match-pipeline';
import type { PipelineWriter } from './pipeline-writer';
import type { LoadedSession } from './session-loader';
import { SessionRunner, type SessionHooks } from './session-runner';

export interface RunnerInput {
  readonly key: FixtureKey;
  readonly loaded: LoadedSession;
  readonly aiEnabled: boolean;
  readonly writer: PipelineWriter;
  readonly scheduler: Scheduler;
  readonly hooks: SessionHooks;
  readonly now: () => string;
}

/**
 * Builds the runner for a stored session and rebuilds its in-memory state:
 * the persisted speed, and for a session that already started, the pipeline
 * state over the ledger with the controller parked after it (PAUSED).
 */
export const createRunner = (input: RunnerInput): SessionRunner => {
  const { key, loaded } = input;
  const runner = new SessionRunner({
    key,
    events: loaded.events,
    pipeline: new MatchPipeline({
      fixture: loaded.fixture,
      aiEnabled: input.aiEnabled,
      now: input.now,
    }),
    writer: input.writer,
    scheduler: input.scheduler,
    hooks: input.hooks,
  });
  // A rebuilt controller starts at the default speed.
  runner.restoreSpeed(loaded.session.status.speed);
  if (loaded.ledgerHead >= 0 || loaded.session.status.state !== 'IDLE') {
    runner.rehydrate(loaded.ledgerHead);
  }
  return runner;
};

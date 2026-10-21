import type {
  Insight,
  MatchEvent,
  ReplayCommand,
  ReplayStatus,
} from '@matchiq/contracts';
import type { FixtureKey } from '@matchiq/db';
import {
  ReplayController,
  type ReplayResult,
  type ReplaySignal,
  type Scheduler,
} from '@matchiq/replay';
import { REPLAY_RUNTIME } from '../constants';
import type { MatchPipeline } from '../pipeline/match-pipeline';
import {
  emptyBatch,
  isEmptyBatch,
  type PipelineBatch,
} from '../pipeline/pipeline-batch';
import type { Publication } from '../pipeline/publication';
import type { PipelineWriter, WriteOutcome } from './pipeline-writer';

type Item =
  | { readonly kind: 'event'; readonly event: MatchEvent }
  | { readonly kind: 'status'; readonly status: ReplayStatus }
  | {
      readonly kind: 'publication';
      readonly insight: Insight;
      readonly publication: Publication;
      readonly claim: 'AGENT' | 'TEMPLATE';
      readonly settle: (outcome: WriteOutcome | Error) => void;
    };

export interface SessionHooks {
  /** Runs after each committed batch, in commit order. */
  afterWrite(key: FixtureKey, batch: PipelineBatch): Promise<void>;
  onFailure(key: FixtureKey, error: unknown): void;
  onHookError(key: FixtureKey, error: unknown): void;
}

export interface SessionRunnerOptions {
  readonly key: FixtureKey;
  /** The session's full event stream (template events rebased to the session fixture). */
  readonly events: readonly MatchEvent[];
  readonly pipeline: MatchPipeline;
  readonly writer: PipelineWriter;
  readonly scheduler: Scheduler;
  readonly hooks: SessionHooks;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One replay session: a `ReplayController` emits events at the chosen speed
 * and a single serial consumer turns them into pipeline batches, so stream
 * order is deterministic regardless of timer jitter or write latency.
 * Commands and agent publications join the same queue behind every event
 * already emitted.
 */
export class SessionRunner {
  private readonly queue: Item[] = [];
  private draining: Promise<void> | null = null;
  private readonly controller: ReplayController;
  /** Next sequence to hand to the pipeline; seeks fast-forward up to here. */
  private nextSequence = 0;
  private failed: unknown = null;

  constructor(private readonly options: SessionRunnerOptions) {
    const created = ReplayController.create({
      fixtureId: options.key.fixtureId,
      events: options.events,
      scheduler: options.scheduler,
      onSignal: (signal) => this.onSignal(signal),
    });
    if (!created.ok) throw new Error(created.error.message);
    this.controller = created.controller;
  }

  get key(): FixtureKey {
    return this.options.key;
  }

  get status(): ReplayStatus {
    return this.controller.status;
  }

  get lastSequence(): number {
    return this.options.events.length - 1;
  }

  get isFailed(): boolean {
    return this.failed !== null;
  }

  /**
   * Rebuilds pipeline state from events already in the ledger without writing
   * anything, then parks the controller after them (PAUSED).
   */
  rehydrate(throughSequence: number): void {
    const discard = emptyBatch();
    for (const event of this.options.events.slice(0, throughSequence + 1)) {
      this.options.pipeline.step(event, discard);
    }
    this.nextSequence = throughSequence + 1;
    if (this.nextSequence <= this.lastSequence) {
      this.controller.execute({ action: 'seek', sequence: this.nextSequence });
    }
  }

  command(command: ReplayCommand): ReplayResult {
    const result = this.controller.execute(command);
    if (result.ok) this.push({ kind: 'status', status: result.status });
    return result;
  }

  submitPublication(input: {
    insight: Insight;
    publication: Publication;
    claim: 'AGENT' | 'TEMPLATE';
  }): Promise<WriteOutcome> {
    return new Promise((resolve, reject) => {
      this.push({
        kind: 'publication',
        ...input,
        settle: (outcome) =>
          outcome instanceof Error ? reject(outcome) : resolve(outcome),
      });
    });
  }

  /** Resolves once every queued item has been written. */
  async whenIdle(): Promise<void> {
    while (this.draining !== null) await this.draining;
  }

  dispose(): void {
    this.controller.dispose();
  }

  private onSignal(signal: ReplaySignal): void {
    if (signal.kind === 'event') {
      if (signal.event.sequence >= this.nextSequence)
        this.enqueueEvent(signal.event);
    } else if (signal.kind === 'reset') {
      // Seeks are forward-only (ADR-0013): ingest the skipped events now.
      for (const event of this.options.events.slice(
        this.nextSequence,
        signal.nextSequence,
      )) {
        this.enqueueEvent(event);
      }
    } else {
      this.push({ kind: 'status', status: this.controller.status });
    }
  }

  private enqueueEvent(event: MatchEvent): void {
    this.nextSequence = event.sequence + 1;
    this.push({ kind: 'event', event });
  }

  private push(item: Item): void {
    if (this.failed !== null) {
      if (item.kind === 'publication') item.settle(toError(this.failed));
      return;
    }
    this.queue.push(item);
    this.draining ??= this.drain().finally(() => {
      this.draining = null;
    });
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0 && this.failed === null) {
      const head = this.queue[0];
      if (head?.kind === 'publication') {
        this.queue.shift();
        await this.writePublication(head);
      } else {
        await this.writeBatch(this.takeBatch());
      }
    }
  }

  /** Events and statuses up to the next publication, bounded per transaction. */
  private takeBatch(): PipelineBatch {
    const batch = emptyBatch();
    const { pipeline } = this.options;
    while (batch.events.length < REPLAY_RUNTIME.maxBatchEvents) {
      const item = this.queue[0];
      if (item === undefined || item.kind === 'publication') break;
      this.queue.shift();
      if (item.kind === 'event') pipeline.step(item.event, batch);
      else pipeline.status(item.status, batch);
    }
    return batch;
  }

  private async writePublication(
    item: Extract<Item, { kind: 'publication' }>,
  ): Promise<void> {
    const batch = emptyBatch();
    batch.claims.push({
      insightId: item.insight.insightId,
      publication: item.claim,
    });
    this.options.pipeline.publish(item.insight, item.publication, batch);
    try {
      const outcome = await this.writeWithRetry(batch);
      if (outcome === 'written') await this.afterWrite(batch);
      item.settle(outcome);
    } catch (error) {
      item.settle(toError(error));
    }
  }

  private async writeBatch(batch: PipelineBatch): Promise<void> {
    if (isEmptyBatch(batch)) return;
    let outcome: WriteOutcome;
    try {
      outcome = await this.writeWithRetry(batch);
    } catch (error) {
      this.fail(error);
      return;
    }
    if (outcome === 'written') await this.afterWrite(batch);
  }

  /** Post-commit effects never fail the session: the batch is already durable. */
  private async afterWrite(batch: PipelineBatch): Promise<void> {
    try {
      await this.options.hooks.afterWrite(this.options.key, batch);
    } catch (error) {
      this.options.hooks.onHookError(this.options.key, error);
    }
  }

  private async writeWithRetry(batch: PipelineBatch): Promise<WriteOutcome> {
    const { key, writer } = this.options;
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await writer.write(key, batch);
      } catch (error) {
        if (attempt >= REPLAY_RUNTIME.writeRetries) throw error;
        await delay(REPLAY_RUNTIME.writeRetryDelayMs * (attempt + 1));
      }
    }
  }

  private fail(error: unknown): void {
    this.failed = error;
    this.controller.dispose();
    for (const item of this.queue.splice(0)) {
      if (item.kind === 'publication') item.settle(toError(error));
    }
    this.options.hooks.onFailure(this.options.key, error);
  }
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

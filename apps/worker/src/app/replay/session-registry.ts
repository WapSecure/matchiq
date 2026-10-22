import type { Fixture, ReplayState } from '@matchiq/contracts';
import type { SessionRunner } from './session-runner';

interface Entry {
  readonly runner: SessionRunner;
  readonly fixture: Fixture;
  lastActivityMs: number;
}

/** A loaded runner holds a replay slot while it plays or is about to start. */
const SLOT_STATES: ReadonlySet<ReplayState> = new Set(['PLAYING', 'IDLE']);

/**
 * The runners this worker has in memory, with the last time each was used.
 * Times come from the replay scheduler, so tests drive them in virtual time.
 */
export class SessionRegistry {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number) {}

  runner(fixtureId: string): SessionRunner | undefined {
    return this.entries.get(fixtureId)?.runner;
  }

  fixture(fixtureId: string): Fixture | undefined {
    return this.entries.get(fixtureId)?.fixture;
  }

  add(fixtureId: string, runner: SessionRunner, fixture: Fixture): void {
    this.entries.set(fixtureId, {
      runner,
      fixture,
      lastActivityMs: this.now(),
    });
  }

  touch(fixtureId: string): void {
    const entry = this.entries.get(fixtureId);
    if (entry) entry.lastActivityMs = this.now();
  }

  /** Slots in use, leaving out `exceptFixtureId`. */
  activeCount(exceptFixtureId?: string): number {
    let count = 0;
    for (const [fixtureId, { runner }] of this.entries) {
      if (fixtureId === exceptFixtureId || runner.isFailed) continue;
      if (SLOT_STATES.has(runner.status.state)) count += 1;
    }
    return count;
  }

  /** Runners that are not playing, not writing and unused for `idleMs`. */
  idle(idleMs: number): string[] {
    const cutoff = this.now() - idleMs;
    return [...this.entries]
      .filter(
        ([, { runner, lastActivityMs }]) =>
          runner.status.state !== 'PLAYING' &&
          !runner.isBusy &&
          lastActivityMs <= cutoff,
      )
      .map(([fixtureId]) => fixtureId);
  }

  remove(fixtureId: string): void {
    this.entries.get(fixtureId)?.runner.dispose();
    this.entries.delete(fixtureId);
  }

  clear(): void {
    for (const fixtureId of [...this.entries.keys()]) this.remove(fixtureId);
  }

  get size(): number {
    return this.entries.size;
  }
}

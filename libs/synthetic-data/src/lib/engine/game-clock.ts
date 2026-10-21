import { TIME } from '../constants.js';

export type RegulationPeriod = 1 | 2;

/** Match clock restarts at 0 each period; wall clock continues from kickoff. */
export class GameClock {
  period: RegulationPeriod = 1;
  ms = 0;
  private readonly kickoffEpochMs: number;
  private readonly stoppageMs: Readonly<Record<RegulationPeriod, number>>;

  constructor(
    kickoffUtc: string,
    stoppageMs: Readonly<Record<RegulationPeriod, number>>,
  ) {
    this.kickoffEpochMs = Date.parse(kickoffUtc);
    this.stoppageMs = stoppageMs;
  }

  get periodEndMs(): number {
    return TIME.periodLengthMs + this.stoppageMs[this.period];
  }

  get isPeriodOver(): boolean {
    return this.ms >= this.periodEndMs;
  }

  /** Absolute match minute ignoring first-half stoppage (45 at the second-half kickoff). */
  get absoluteMinute(): number {
    const offset = (this.period - 1) * TIME.periodLengthMs;
    return (offset + Math.min(this.ms, TIME.periodLengthMs)) / TIME.msPerMinute;
  }

  advance(durationMs: number): void {
    this.ms += Math.max(0, Math.round(durationMs));
  }

  startPeriod(period: RegulationPeriod): void {
    this.period = period;
    this.ms = 0;
  }

  wallClockUtc(): string {
    const firstHalfMs = TIME.periodLengthMs + this.stoppageMs[1];
    const periodOffset =
      this.period === 1 ? 0 : firstHalfMs + TIME.halfTimeBreakMs;
    return new Date(this.kickoffEpochMs + periodOffset + this.ms).toISOString();
  }
}

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly cooldownMs: number;
  readonly now: () => number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Opens after `failureThreshold` consecutive failures and rejects calls for
 * `cooldownMs`; then lets one trial call through (half-open). A success
 * closes it, a failure re-opens it (AI_AGENT_GOVERNANCE rule 4).
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;

  constructor(private readonly options: CircuitBreakerOptions) {}

  get state(): CircuitState {
    if (this.openedAt === null) return 'closed';
    return this.options.now() - this.openedAt >= this.options.cooldownMs
      ? 'half-open'
      : 'open';
  }

  /** False when the call must not be attempted. */
  tryAcquire(): boolean {
    const state = this.state;
    if (state === 'closed') return true;
    if (state === 'open' || this.trialInFlight) return false;
    this.trialInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
    this.trialInFlight = false;
  }

  recordFailure(): void {
    this.trialInFlight = false;
    this.failures += 1;
    if (
      this.openedAt !== null ||
      this.failures >= this.options.failureThreshold
    ) {
      this.openedAt = this.options.now();
    }
  }
}

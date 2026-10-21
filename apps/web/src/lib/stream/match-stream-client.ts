import type { StreamMessage } from '@matchiq/contracts';
import { STREAM_TIMING } from '@/constants/api';
import { type BackoffPolicy, backoffDelay, DEFAULT_BACKOFF } from './backoff';
import {
  browserNetworkMonitor,
  type ConnectionState,
  type ConnectionStatus,
  INITIAL_CONNECTION,
  type NetworkMonitor,
} from './connection';
import { decodeFrame } from './decode-frame';
import type { SseFrame } from './sse-parser';
import { fetchSseTransport, type SseTransport } from './sse-transport';

/** Fields that change per message and must not trigger a status notification. */
const SILENT_KEYS = new Set<keyof ConnectionStatus>([
  'lastMessageAt',
  'lastStreamSequence',
]);

export type StreamGap = { expected: number; received: number };

export type MatchStreamClientOptions = {
  url: string;
  fixtureId: string;
  onMessage: (message: StreamMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
  /** Refetch the snapshot; messages received meanwhile are held, then replayed. */
  onGap?: (gap: StreamGap) => Promise<void>;
  onInvalidMessage?: (reason: string) => void;
  transport?: SseTransport;
  network?: NetworkMonitor;
  backoff?: BackoffPolicy;
  random?: () => number;
  staleAfterMs?: number;
  reconnectAfterStaleMs?: number;
  lastEventId?: string | null;
};

/**
 * Resumable, validating SSE client for one fixture (ADR-0005): at-least-once
 * delivery is made idempotent by dropping any `streamSequence` already seen.
 */
export class MatchStreamClient {
  private readonly options: MatchStreamClientOptions;
  private readonly transport: SseTransport;
  private readonly network: NetworkMonitor;
  private status: ConnectionStatus = INITIAL_CONNECTION;
  private lastSequence: number | null = null;
  private resumeId: string | null;
  private controller: AbortController | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private unsubscribeNetwork: (() => void) | null = null;
  private held: StreamMessage[] | null = null;
  private running = false;

  constructor(options: MatchStreamClientOptions) {
    this.options = options;
    this.transport = options.transport ?? fetchSseTransport();
    this.network = options.network ?? browserNetworkMonitor;
    this.resumeId = options.lastEventId ?? null;
  }

  get connection(): ConnectionStatus {
    return this.status;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.unsubscribeNetwork = this.network.subscribe(this.onNetworkChange);
    this.watchdog = setInterval(
      this.checkLiveness,
      STREAM_TIMING.watchdogIntervalMs,
    );
    if (this.network.isOnline()) void this.connect();
    else this.setStatus({ state: 'offline' });
  }

  stop(): void {
    this.running = false;
    this.controller?.abort();
    this.controller = null;
    this.clearRetry();
    if (this.watchdog !== null) clearInterval(this.watchdog);
    this.watchdog = null;
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = null;
  }

  private async connect(): Promise<void> {
    this.clearRetry();
    const controller = new AbortController();
    this.controller = controller;
    const frames = this.transport({
      url: this.options.url,
      lastEventId: this.resumeId,
      signal: controller.signal,
    });
    try {
      for await (const frame of frames) this.handleFrame(frame);
    } catch {
      // Transport failures and aborts both fall through to the reconnect policy.
    }
    if (this.running && this.controller === controller)
      this.scheduleReconnect();
  }

  private handleFrame(frame: SseFrame): void {
    const decoded = decodeFrame(frame, this.options.fixtureId);
    if (!decoded.ok) {
      this.options.onInvalidMessage?.(decoded.reason);
      return;
    }
    const { message } = decoded;
    this.setStatus({
      state: 'live',
      attempt: 0,
      retryInMs: null,
      lastMessageAt: Date.now(),
    });
    if (
      this.lastSequence !== null &&
      message.streamSequence <= this.lastSequence
    )
      return;
    const expected = this.lastSequence === null ? null : this.lastSequence + 1;
    this.lastSequence = message.streamSequence;
    this.resumeId = String(message.streamSequence);
    this.setStatus({ lastStreamSequence: message.streamSequence });
    if (expected !== null && message.streamSequence > expected) {
      this.beginResync({ expected, received: message.streamSequence }, message);
    } else {
      this.deliver(message);
    }
  }

  private deliver(message: StreamMessage): void {
    if (this.held) this.held.push(message);
    else this.options.onMessage(message);
  }

  private beginResync(gap: StreamGap, message: StreamMessage): void {
    if (this.held || !this.options.onGap) {
      this.deliver(message);
      return;
    }
    this.held = [message];
    void this.options
      .onGap(gap)
      .catch(() => undefined)
      .finally(() => {
        const held = this.held ?? [];
        this.held = null;
        held.forEach((m) => this.options.onMessage(m));
      });
  }

  private scheduleReconnect(): void {
    if (!this.network.isOnline()) {
      this.setStatus({ state: 'offline', retryInMs: null });
      return;
    }
    const attempt = this.status.attempt;
    const delay = backoffDelay(
      attempt,
      this.options.backoff ?? DEFAULT_BACKOFF,
      this.options.random,
    );
    this.setStatus({
      state: 'reconnecting',
      attempt: attempt + 1,
      retryInMs: delay,
    });
    this.retryTimer = setTimeout(() => void this.connect(), delay);
  }

  private readonly checkLiveness = (): void => {
    const { lastMessageAt, state } = this.status;
    if (lastMessageAt === null || (state !== 'live' && state !== 'stale'))
      return;
    const silentMs = Date.now() - lastMessageAt;
    const reconnectAfter =
      this.options.reconnectAfterStaleMs ?? STREAM_TIMING.reconnectAfterStaleMs;
    if (silentMs >= reconnectAfter) {
      this.controller?.abort();
    } else if (
      silentMs >= (this.options.staleAfterMs ?? STREAM_TIMING.staleAfterMs)
    ) {
      this.setState('stale');
    }
  };

  private readonly onNetworkChange = (online: boolean): void => {
    if (!this.running) return;
    if (online) {
      this.setStatus({ state: 'reconnecting', attempt: 0 });
      this.controller?.abort();
      this.controller = null;
      void this.connect();
      return;
    }
    this.clearRetry();
    this.controller?.abort();
    this.controller = null;
    this.setStatus({ state: 'offline', retryInMs: null });
  };

  private clearRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private setState(state: ConnectionState): void {
    this.setStatus({ state });
  }

  private setStatus(patch: Partial<ConnectionStatus>): void {
    const next = { ...this.status, ...patch };
    const changed = (Object.keys(patch) as (keyof ConnectionStatus)[]).some(
      (key) => !SILENT_KEYS.has(key) && next[key] !== this.status[key],
    );
    this.status = next;
    if (changed) this.options.onStatus?.(next);
  }
}

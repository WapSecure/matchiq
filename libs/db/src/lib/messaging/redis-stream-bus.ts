import { StreamMessage } from '@matchiq/contracts';
import type { Redis } from 'ioredis';
import {
  REDIS_CHANNEL_SEGMENT,
  REDIS_CHANNEL_SEPARATOR,
  REDIS_PONG,
} from '../constants.js';
import type {
  FixtureKey,
  Pingable,
  StreamPublisher,
  StreamSubscriber,
  Unsubscribe,
} from '../ports.js';

type Handler = (message: StreamMessage) => void;

interface ChannelState {
  readonly handlers: Set<Handler>;
  /** Resolves once Redis confirms the SUBSCRIBE; every joiner awaits it. */
  readonly ready: Promise<unknown>;
}

export interface RedisStreamBusOptions {
  /** Connection used for PUBLISH and PING. */
  readonly publisher: Redis;
  /** Dedicated connection; Redis forbids other commands once it subscribes. */
  readonly subscriber: Redis;
  readonly keyPrefix: string;
  readonly onInvalidMessage?: (channel: string, reason: string) => void;
}

export const streamChannel = (prefix: string, key: FixtureKey): string =>
  [prefix, REDIS_CHANNEL_SEGMENT, key.orgId, key.fixtureId].join(
    REDIS_CHANNEL_SEPARATOR,
  );

/** Redis pub/sub fan-out with one shared subscription per fixture channel. */
export class RedisStreamBus
  implements StreamPublisher, StreamSubscriber, Pingable
{
  private readonly channels = new Map<string, ChannelState>();

  constructor(private readonly options: RedisStreamBusOptions) {
    options.subscriber.on('message', (channel: string, raw: string) =>
      this.dispatch(channel, raw),
    );
  }

  async publish(key: FixtureKey, message: StreamMessage): Promise<void> {
    await this.options.publisher.publish(
      streamChannel(this.options.keyPrefix, key),
      JSON.stringify(message),
    );
  }

  async subscribe(key: FixtureKey, onMessage: Handler): Promise<Unsubscribe> {
    const channel = streamChannel(this.options.keyPrefix, key);
    let state = this.channels.get(channel);
    if (!state) {
      state = {
        handlers: new Set(),
        ready: this.options.subscriber.subscribe(channel),
      };
      this.channels.set(channel, state);
    }
    state.handlers.add(onMessage);
    try {
      await state.ready;
    } catch (error) {
      await this.release(channel, onMessage);
      throw error;
    }
    return () => this.release(channel, onMessage);
  }

  async ping(): Promise<void> {
    const reply = await this.options.publisher.ping();
    if (reply !== REDIS_PONG) throw new Error('Unexpected PING reply');
  }

  private async release(channel: string, handler: Handler): Promise<void> {
    const state = this.channels.get(channel);
    if (!state?.handlers.delete(handler) || state.handlers.size > 0) return;
    this.channels.delete(channel);
    await this.options.subscriber.unsubscribe(channel);
  }

  private dispatch(channel: string, raw: string): void {
    const state = this.channels.get(channel);
    if (!state) return;
    const parsed = StreamMessage.safeParse(safeJson(raw));
    if (!parsed.success) {
      this.options.onInvalidMessage?.(channel, parsed.error.message);
      return;
    }
    for (const handler of state.handlers) handler(parsed.data);
  }
}

const safeJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

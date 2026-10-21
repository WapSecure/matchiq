import { Logger } from '@nestjs/common';
import { RedisStreamBus } from '@matchiq/db';
import { Redis, type RedisOptions } from 'ioredis';

const REDIS_OPTIONS: RedisOptions = {
  connectTimeout: 2_000,
  // Fail commands quickly while disconnected so publishes retry from the outbox
  // and SSE connects answer 503 instead of hanging.
  maxRetriesPerRequest: 2,
};

const CONNECTION_NAMES = {
  publisher: 'matchiq-api-pub',
  subscriber: 'matchiq-api-sub',
} as const;

export interface RedisConnections {
  readonly bus: RedisStreamBus;
  close(): Promise<void>;
}

export const createRedisConnections = (
  url: string,
  keyPrefix: string,
): RedisConnections => {
  const logger = new Logger('Redis');
  const connect = (connectionName: string): Redis => {
    const client = new Redis(url, { ...REDIS_OPTIONS, connectionName });
    client.on('error', (error: Error) =>
      logger.warn(`${connectionName}: ${error.message}`),
    );
    return client;
  };
  const publisher = connect(CONNECTION_NAMES.publisher);
  const subscriber = connect(CONNECTION_NAMES.subscriber);
  const bus = new RedisStreamBus({
    publisher,
    subscriber,
    keyPrefix,
    onInvalidMessage: (channel, reason) =>
      logger.warn(`Dropped invalid message on ${channel}: ${reason}`),
  });
  return {
    bus,
    close: async () => {
      publisher.disconnect();
      subscriber.disconnect();
    },
  };
};

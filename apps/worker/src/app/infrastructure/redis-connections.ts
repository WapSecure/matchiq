import { Logger } from '@nestjs/common';
import { RedisStreamBus, type QueueConnection } from '@matchiq/db';
import { Redis, type RedisOptions } from 'ioredis';
import { REDIS_CONNECTION_NAMES } from '../constants';

const PUBLISH_OPTIONS: RedisOptions = {
  connectTimeout: 2_000,
  // Fail publishes quickly so rows stay in the outbox and are retried.
  maxRetriesPerRequest: 2,
};

/** BullMQ workers block on Redis and require unlimited per-request retries. */
const QUEUE_OPTIONS: RedisOptions = {
  connectTimeout: 2_000,
  maxRetriesPerRequest: null,
};

export interface WorkerRedis {
  readonly bus: RedisStreamBus;
  readonly queues: QueueConnection;
  close(): Promise<void>;
}

export const createWorkerRedis = (
  url: string,
  keyPrefix: string,
): WorkerRedis => {
  const logger = new Logger('Redis');
  const connect = (connectionName: string, options: RedisOptions): Redis => {
    const client = new Redis(url, { ...options, connectionName });
    client.on('error', (error: Error) =>
      logger.warn(`${connectionName}: ${error.message}`),
    );
    return client;
  };
  const publisher = connect(REDIS_CONNECTION_NAMES.publisher, PUBLISH_OPTIONS);
  // The worker never subscribes; the bus only needs a connection object.
  const subscriber = connect(REDIS_CONNECTION_NAMES.subscriber, {
    ...PUBLISH_OPTIONS,
    lazyConnect: true,
  });
  const queueConnection = connect(REDIS_CONNECTION_NAMES.queues, QUEUE_OPTIONS);
  return {
    bus: new RedisStreamBus({ publisher, subscriber, keyPrefix }),
    queues: { connection: queueConnection, prefix: keyPrefix },
    close: async () => {
      publisher.disconnect();
      subscriber.disconnect();
      queueConnection.disconnect();
    },
  };
};

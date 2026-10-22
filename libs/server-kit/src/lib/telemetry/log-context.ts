import { AsyncLocalStorage } from 'node:async_hooks';

/** Low-cardinality identifiers stamped on every log line in a unit of work. */
export interface LogContext {
  requestId?: string;
  correlationId?: string;
  orgId?: string;
  fixtureId?: string;
  jobId?: string;
  queue?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

const defined = (fields: LogContext): LogContext =>
  Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  ) as LogContext;

/** Runs `fn` with `fields` layered over the current context. */
export const withLogContext = <T>(fields: LogContext, fn: () => T): T =>
  storage.run({ ...storage.getStore(), ...defined(fields) }, fn);

/** Adds fields to the current unit of work, for example once routing resolved a fixture. */
export const annotateLogContext = (fields: LogContext): void => {
  const store = storage.getStore();
  if (store) Object.assign(store, defined(fields));
};

export const currentLogContext = (): LogContext => ({
  ...storage.getStore(),
});

import { Logger } from '@nestjs/common';
import { context, trace, type SpanContext } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { annotateLogContext, currentLogContext, withLogContext } from './log-context';
import { resolveLogFormat } from './nest-logger';
import { prettyLine } from './pretty-stream';
import { createServiceLogger, PinoLoggerService } from './service-logger';
import { REDACTED } from './telemetry.constants';

const capture = () => {
  const lines: Record<string, unknown>[] = [];
  const logger = createServiceLogger({
    service: 'matchiq-test',
    version: '1.2.3',
    environment: 'test',
    level: 'debug',
    format: 'json',
    destination: {
      write: (chunk: string) => {
        lines.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    },
  });
  return { lines, logger, nest: new PinoLoggerService(logger) };
};

describe('log context', () => {
  it('layers fields over the enclosing context and drops undefined values', () => {
    withLogContext({ requestId: 'req-1', orgId: 'org_demo' }, () => {
      withLogContext({ fixtureId: 'fx_1', orgId: undefined }, () => {
        expect(currentLogContext()).toEqual({
          requestId: 'req-1',
          orgId: 'org_demo',
          fixtureId: 'fx_1',
        });
      });
      expect(currentLogContext()).toEqual({ requestId: 'req-1', orgId: 'org_demo' });
    });
    expect(currentLogContext()).toEqual({});
  });

  it('follows the unit of work across awaits and timers', async () => {
    const seen = await withLogContext({ correlationId: 'corr-1' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      annotateLogContext({ fixtureId: 'fx_2' });
      return currentLogContext();
    });
    expect(seen).toEqual({ correlationId: 'corr-1', fixtureId: 'fx_2' });
  });

  it('ignores annotations outside any unit of work', () => {
    annotateLogContext({ fixtureId: 'fx_3' });
    expect(currentLogContext()).toEqual({});
  });
});

describe('service logger', () => {
  // Registers the async-local-storage context manager the SDK would install.
  beforeAll(() => new NodeTracerProvider().register());

  it('writes one JSON line with service fields, level label and the log context', () => {
    const { lines, nest } = capture();
    withLogContext(
      { requestId: 'req-9', correlationId: 'corr-9', orgId: 'org_demo', fixtureId: 'fx_9' },
      () => nest.log('replay started', 'SessionManager'),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'info',
      service: 'matchiq-test',
      version: '1.2.3',
      env: 'test',
      msg: 'replay started',
      context: 'SessionManager',
      requestId: 'req-9',
      correlationId: 'corr-9',
      orgId: 'org_demo',
      fixtureId: 'fx_9',
    });
    expect(typeof lines[0]?.['time']).toBe('string');
  });

  it('stamps the active trace and span ids', () => {
    const { lines, nest } = capture();
    const spanContext: SpanContext = {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: 1,
    };
    context.with(trace.setSpanContext(context.active(), spanContext), () =>
      nest.warn('slow agent'),
    );
    expect(lines[0]).toMatchObject({
      level: 'warn',
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    });
  });

  it('redacts secret fields and credential text in messages and stacks', () => {
    const { lines, nest } = capture();
    nest.log({ msg: 'calling agents', authorization: 'Bearer abc', attempt: 1 });
    nest.error('redis://user:pw@cache failed', 'Error: Bearer xyz\n  at x', 'Redis');
    expect(lines[0]).toMatchObject({ authorization: REDACTED, attempt: 1 });
    expect(lines[1]).toMatchObject({
      level: 'error',
      context: 'Redis',
      msg: `redis://${REDACTED}@cache failed`,
      stack: `Error: Bearer ${REDACTED}\n  at x`,
    });
    expect(JSON.stringify(lines)).not.toMatch(/abc|pw@|xyz/);
  });

  it('routes the static Nest Logger through pino once installed', () => {
    const { lines, nest } = capture();
    Logger.overrideLogger(nest);
    try {
      new Logger('Bootstrap').log('listening');
    } finally {
      Logger.overrideLogger(false);
    }
    expect(lines.at(-1)).toMatchObject({ msg: 'listening', context: 'Bootstrap' });
  });

  it('respects the level threshold', () => {
    const { lines, nest } = capture();
    nest.setLogLevels(['warn', 'error']);
    nest.log('hidden');
    nest.warn('shown');
    expect(lines.map((l) => l['msg'])).toEqual(['shown']);
  });

  it('formats pretty lines for local development without field loss', () => {
    const line = prettyLine(
      JSON.stringify({ level: 'info', time: '2026-10-22T12:00:00.123Z', msg: 'hi', context: 'Http', route: '/x' }),
    );
    expect(line).toContain('12:00:00.123');
    expect(line).toContain('[Http] hi');
    expect(line).toContain('"route":"/x"');
  });

  it('defaults to pretty locally and JSON elsewhere unless LOG_FORMAT says otherwise', () => {
    const base = { APP_VERSION: '1', LOG_LEVEL: 'info' as const };
    expect(resolveLogFormat({ ...base, APP_ENV: 'local' })).toBe('pretty');
    expect(resolveLogFormat({ ...base, APP_ENV: 'prod' })).toBe('json');
    expect(resolveLogFormat({ ...base, APP_ENV: 'local', LOG_FORMAT: 'json' })).toBe('json');
  });
});

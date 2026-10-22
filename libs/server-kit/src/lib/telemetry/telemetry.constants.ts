export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REDACTED = '[REDACTED]';
export const REDACTION_MAX_DEPTH = 6;

/** Field names whose values never reach a log line (SECURITY_STANDARDS.md). */
export const REDACTED_KEY_PATTERN =
  /authorization|cookie|passw(or)?d|pwd|secret|token(?!s?(in|out|count))|api[-_]?key|credential|connection[-_]?string|private[-_]?key|ticket/i;

/** Credential shapes scrubbed from free text such as error messages. */
export const REDACTED_TEXT_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${REDACTED}`],
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, `$1${REDACTED}@`],
  [
    /\b(InstrumentationKey|AccountKey|SharedAccessKey|Password|Pwd|token|ticket|api[-_]?key)=([^;&\s]+)/gi,
    `$1=${REDACTED}`,
  ],
];

export const LOG_LEVELS = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  debug: 'debug',
  verbose: 'trace',
  fatal: 'fatal',
} as const;

export const LOG_FIELDS = {
  context: 'context',
  stack: 'stack',
  traceId: 'traceId',
  spanId: 'spanId',
} as const;

export const ACCESS_LOG = {
  context: 'Http',
  message: 'request completed',
} as const;

/** Routes whose access lines drop to debug: probes and scrapes are noise. */
export const QUIET_ROUTE_PATTERN = /\/health(\/|$)|\/metrics$/;

/** Mirrors `PRINCIPAL_PROPERTY` in libs/auth, which server-kit (type:util) cannot import. */
export const ACTOR_REQUEST_FIELD = 'matchiqPrincipal';
export const FIXTURE_ROUTE_PARAM = 'fixtureId';
export const UNMATCHED_ROUTE = 'unmatched';

export const PRETTY = {
  time: (iso: string) => iso.slice(11, 23),
  colors: {
    trace: '\x1b[90m',
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    fatal: '\x1b[35m',
  } as Readonly<Record<string, string>>,
  reset: '\x1b[0m',
  omit: ['level', 'time', 'msg', 'service', 'version', 'env', 'pid', 'hostname'],
} as const;

export const TRACING = {
  tracesPath: '/v1/traces',
  queueTracer: 'matchiq-bullmq',
  clientTracer: 'matchiq-http-client',
  attributes: {
    serviceName: 'service.name',
    serviceVersion: 'service.version',
    environment: 'deployment.environment.name',
  },
  disabledFlag: 'OTEL_SDK_DISABLED',
} as const;

export const TRACING_NOTICES = {
  azureViaCollector:
    'APPLICATIONINSIGHTS_CONNECTION_STRING is set but no in-process Azure exporter is bundled; set OTEL_EXPORTER_OTLP_ENDPOINT to an OpenTelemetry Collector with the azuremonitor exporter (docs/operations/OBSERVABILITY.md)',
  enabled: (endpoint: string) => `Tracing enabled; exporting OTLP to ${endpoint}`,
} as const;

export const METRICS_LOG = {
  context: 'Metrics',
  tracingContext: 'Tracing',
  listening: (host: string, port: number) =>
    `Prometheus metrics on http://${host}:${port}/metrics`,
} as const;

export const METRICS = {
  prefix: 'matchiq_',
  contentPath: '/metrics',
  durationBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  notFound: 'Not found',
} as const;

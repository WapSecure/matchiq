import { PipelineResult, type PipelineRequest } from '@matchiq/contracts';
import {
  CORRELATION_ID_HEADER,
  injectTraceHeaders,
  withClientSpan,
} from '@matchiq/server-kit';
import { Logger } from '@nestjs/common';
import {
  AGENTS_HTTP,
  AGENTS_ISSUE_LOG_LIMIT,
  FALLBACK_REASONS,
  LOG_MESSAGES,
} from '../constants';

const logger = new Logger('AgentsClient');

/** Port to the stateless agents service; it proposes, the worker's gate commits. */
export interface AgentsClient {
  run(request: PipelineRequest): Promise<PipelineResult>;
  /** Cheap reachability probe for readiness; never throws. */
  reachable(): Promise<boolean>;
}

export type AgentsFailureKind =
  'timeout' | 'unreachable' | 'http' | 'invalid-response';

/** Every agents-service failure; `retriable` drives BullMQ retries. */
export class AgentsCallError extends Error {
  constructor(
    readonly kind: AgentsFailureKind,
    message: string,
    readonly retriable: boolean,
  ) {
    super(message);
  }
}

export interface HttpAgentsClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly timeoutMs: number;
}

const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;
const HTTP_TOO_MANY_REQUESTS = 429;

const isTimeout = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'TimeoutError' || error.name === 'AbortError');

/** 4xx other than 429 means the request itself is wrong; retrying cannot help. */
const retriableStatus = (status: number): boolean =>
  status >= HTTP_SERVER_ERROR_MIN ||
  status === HTTP_TOO_MANY_REQUESTS ||
  status < HTTP_CLIENT_ERROR_MIN;

export class HttpAgentsClient implements AgentsClient {
  constructor(private readonly options: HttpAgentsClientOptions) {}

  run(request: PipelineRequest): Promise<PipelineResult> {
    return withClientSpan(
      AGENTS_HTTP.spanName,
      { [AGENTS_HTTP.correlationAttribute]: request.packet.correlationId },
      () => this.call(request),
    );
  }

  private async call(request: PipelineRequest): Promise<PipelineResult> {
    const response = await this.post(request);
    if (!response.ok) {
      throw new AgentsCallError(
        'http',
        FALLBACK_REASONS.httpStatus(response.status),
        retriableStatus(response.status),
      );
    }
    const parsed = PipelineResult.safeParse(
      await response.json().catch(() => null),
    );
    if (!parsed.success) {
      logger.warn(
        LOG_MESSAGES.invalidAgentsResult(
          request.packet.correlationId,
          parsed.error.issues.length,
          parsed.error.issues
            .slice(0, AGENTS_ISSUE_LOG_LIMIT)
            .map((issue) => `${issue.path.join('.')} ${issue.code}`),
        ),
      );
      throw new AgentsCallError(
        'invalid-response',
        FALLBACK_REASONS.invalidResponse,
        false,
      );
    }
    return parsed.data;
  }

  async reachable(): Promise<boolean> {
    try {
      const response = await fetch(
        new URL(AGENTS_HTTP.livenessPath, this.options.baseUrl),
        {
          signal: AbortSignal.timeout(AGENTS_HTTP.probeTimeoutMs),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async post(request: PipelineRequest): Promise<Response> {
    try {
      return await fetch(
        new URL(AGENTS_HTTP.pipelinePath, this.options.baseUrl),
        {
          method: 'POST',
          headers: injectTraceHeaders({
            authorization: `${AGENTS_HTTP.bearerPrefix}${this.options.token}`,
            'content-type': AGENTS_HTTP.contentType,
            [CORRELATION_ID_HEADER]: request.packet.correlationId,
          }),
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.options.timeoutMs),
        },
      );
    } catch (error) {
      if (isTimeout(error)) {
        throw new AgentsCallError('timeout', FALLBACK_REASONS.timeout, true);
      }
      throw new AgentsCallError(
        'unreachable',
        FALLBACK_REASONS.unreachable,
        true,
      );
    }
  }
}

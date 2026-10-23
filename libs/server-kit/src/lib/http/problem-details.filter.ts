import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ProblemDetails } from '@matchiq/contracts';
import type { Request, Response } from 'express';
import {
  HTTP_STATUS_TITLES,
  PROBLEM_CONTENT_TYPE,
  PROBLEM_SLUGS,
  PROBLEM_TITLES,
  PROBLEM_TYPE_PREFIX,
  QUERY_SEPARATOR,
} from '../constants';
import { ProblemException } from './problem.exception';
import { RequestValidationError } from './request-validation.error';
import { requestIdOf } from './request-id.middleware';

const problemType = (status: number, slug?: string): string =>
  `${PROBLEM_TYPE_PREFIX}${slug ?? PROBLEM_SLUGS[status] ?? `http-${status}`}`;

const pathOf = (req: Request): string =>
  req.originalUrl.split(QUERY_SEPARATOR, 1)[0] ?? req.originalUrl;

const titleOf = (status: number): string =>
  status >= HttpStatus.INTERNAL_SERVER_ERROR
    ? PROBLEM_TITLES.internal
    : (HTTP_STATUS_TITLES[status] ?? PROBLEM_TITLES.fallback);

/** Body-parser failures arrive as plain errors that carry an HTTP status. */
const clientStatusOf = (exception: unknown): number | null => {
  if (typeof exception !== 'object' || exception === null) return null;
  const { status } = exception as { status?: unknown };
  return typeof status === 'number' &&
    status >= HttpStatus.BAD_REQUEST &&
    status < HttpStatus.INTERNAL_SERVER_ERROR
    ? status
    : null;
};

/** Renders every error as RFC 9457 problem details without leaking internals. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const problem = this.toProblem(exception, req);
    if (exception instanceof ProblemException) {
      for (const [name, value] of Object.entries(
        exception.problem.headers ?? {},
      )) {
        res.setHeader(name, value);
      }
    }

    if (problem.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { requestId: problem.requestId, path: req.path },
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    res.status(problem.status).type(PROBLEM_CONTENT_TYPE).json(problem);
  }

  private toProblem(exception: unknown, req: Request): ProblemDetails {
    // The query is dropped: it can carry a stream ticket (ADR-0018).
    const base = { instance: pathOf(req), requestId: requestIdOf(req) };

    if (exception instanceof ProblemException) {
      const { status, title, detail, slug, errors } = exception.problem;
      return {
        ...base,
        type: problemType(status, slug),
        title,
        status,
        ...(detail === undefined ? {} : { detail }),
        ...(errors === undefined ? {} : { errors: [...errors] }),
      };
    }
    if (exception instanceof RequestValidationError) {
      const status = exception.getStatus();
      return {
        ...base,
        type: problemType(status),
        title: PROBLEM_TITLES.validation,
        status,
        errors: [...exception.fieldErrors],
      };
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (clientStatusOf(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR);
    return {
      ...base,
      type: problemType(status),
      title: titleOf(status),
      status,
    };
  }
}

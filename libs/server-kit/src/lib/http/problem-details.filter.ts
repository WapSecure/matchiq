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

const titleOf = (exception: HttpException): string => {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string') return message;
  }
  return exception.message;
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
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        ...base,
        type: problemType(status),
        title: titleOf(exception),
        status,
      };
    }
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      ...base,
      type: problemType(status),
      title: PROBLEM_TITLES.internal,
      status,
    };
  }
}

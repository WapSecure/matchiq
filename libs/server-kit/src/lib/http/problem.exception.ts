import { HttpException } from '@nestjs/common';
import type { FieldError } from './request-validation.error';

export interface ProblemInit {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  /** Overrides the status-derived slug in `urn:matchiq:problem:<slug>`. */
  readonly slug?: string;
  readonly errors?: readonly FieldError[];
  /** Response headers such as `WWW-Authenticate`. */
  readonly headers?: Readonly<Record<string, string>>;
}

/** An HTTP error rendered verbatim as RFC 9457 problem details. */
export class ProblemException extends HttpException {
  constructor(readonly problem: ProblemInit) {
    super(problem.title, problem.status);
  }
}

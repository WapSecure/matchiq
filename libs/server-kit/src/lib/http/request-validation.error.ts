import { HttpException, HttpStatus } from '@nestjs/common';
import type { ProblemDetails } from '@matchiq/contracts';
import { PROBLEM_TITLES } from '../constants';

export type FieldError = NonNullable<ProblemDetails['errors']>[number];

export class RequestValidationError extends HttpException {
  constructor(readonly fieldErrors: readonly FieldError[]) {
    super(PROBLEM_TITLES.validation, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

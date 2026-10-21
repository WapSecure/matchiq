import { HttpStatus } from '@nestjs/common';
import { type FieldError, ProblemException } from '@matchiq/server-kit';
import { PROBLEMS } from '../constants';

type ProblemKind = keyof typeof PROBLEMS;

const STATUS: Readonly<Record<ProblemKind, HttpStatus>> = {
  unauthorized: HttpStatus.UNAUTHORIZED,
  fixtureNotFound: HttpStatus.NOT_FOUND,
  fixtureExists: HttpStatus.CONFLICT,
  fixtureMismatch: HttpStatus.UNPROCESSABLE_ENTITY,
  eventConflict: HttpStatus.CONFLICT,
  idempotencyMismatch: HttpStatus.UNPROCESSABLE_ENTITY,
  invalidHeader: HttpStatus.BAD_REQUEST,
  streamUnavailable: HttpStatus.SERVICE_UNAVAILABLE,
  templateNotFound: HttpStatus.NOT_FOUND,
  sessionNotFound: HttpStatus.NOT_FOUND,
  replayConflict: HttpStatus.CONFLICT,
  replayUnavailable: HttpStatus.SERVICE_UNAVAILABLE,
  stateNotFound: HttpStatus.NOT_FOUND,
  recapNotReady: HttpStatus.NOT_FOUND,
};

export const problem = (
  kind: ProblemKind,
  extra: { detail?: string; errors?: readonly FieldError[] } = {},
): ProblemException =>
  new ProblemException({ status: STATUS[kind], ...PROBLEMS[kind], ...extra });

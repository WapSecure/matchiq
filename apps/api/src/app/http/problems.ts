import { HttpStatus } from '@nestjs/common';
import { type FieldError, ProblemException } from '@matchiq/server-kit';
import { PROBLEMS } from '../constants';

export type ProblemKind = keyof typeof PROBLEMS;

export const PROBLEM_STATUS: Readonly<Record<ProblemKind, HttpStatus>> = {
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
  replayCapacity: HttpStatus.SERVICE_UNAVAILABLE,
  stateNotFound: HttpStatus.NOT_FOUND,
  recapNotReady: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  overlayNotFound: HttpStatus.NOT_FOUND,
  overlayNotOnAir: HttpStatus.CONFLICT,
  insightNotFound: HttpStatus.NOT_FOUND,
  insightPublished: HttpStatus.CONFLICT,
  invalidCursor: HttpStatus.BAD_REQUEST,
  overlayNotAwaiting: HttpStatus.CONFLICT,
  approvalExpired: HttpStatus.CONFLICT,
  reviewStale: HttpStatus.CONFLICT,
  airPaused: HttpStatus.CONFLICT,
  demoFaultsDisabled: HttpStatus.FORBIDDEN,
};

export const problem = (
  kind: ProblemKind,
  extra: {
    detail?: string;
    errors?: readonly FieldError[];
    headers?: Readonly<Record<string, string>>;
  } = {},
): ProblemException =>
  new ProblemException({
    status: PROBLEM_STATUS[kind],
    ...PROBLEMS[kind],
    ...extra,
  });

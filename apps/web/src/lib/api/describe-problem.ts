import { REPLAY_COPY } from '@/constants/replay';
import { isApiError } from './api-error';

/** Human copy for replay-control failures (409, 429, 503), else the problem text. */
export const describeReplayProblem = (error: unknown): string => {
  if (!isApiError(error)) return REPLAY_COPY.failed;
  const detail = error.problem.detail ?? error.problem.title;
  const copy = REPLAY_COPY.problems[error.status];
  if (typeof copy === 'function') return copy(detail);
  return copy ?? detail;
};

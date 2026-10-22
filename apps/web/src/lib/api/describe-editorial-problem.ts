import { EDITORIAL_PROBLEMS } from '@/constants/editorial';
import { isApiError } from './api-error';

export type ProblemView = { message: string; reference: string | null };

const slugOf = (type: string): string => type.slice(type.lastIndexOf(':') + 1);

/** Readable copy for a failed producer command; never the raw payload. */
export const describeEditorialProblem = (error: unknown): ProblemView => {
  if (!isApiError(error)) {
    return { message: EDITORIAL_PROBLEMS.fallback, reference: null };
  }
  const { problem } = error;
  const message =
    EDITORIAL_PROBLEMS.bySlug[slugOf(problem.type)] ??
    EDITORIAL_PROBLEMS.byStatus[problem.status] ??
    problem.detail ??
    problem.title;
  return { message, reference: problem.requestId ?? null };
};

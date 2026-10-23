import { EDITORIAL_PROBLEMS } from '@/constants/editorial';
import { humanizeError } from '@/lib/errors/humanize-error';

export type ProblemView = { error: unknown; message: string };

/**
 * A producer command's failure in gallery words. Category messages say
 * plainly that nothing changed; the raw problem is never shown.
 */
export const describeEditorialProblem = (error: unknown): string => {
  const human = humanizeError(error);
  if (human.specific) return `${human.title}. ${human.message}`;
  return (
    EDITORIAL_PROBLEMS.byKind[human.kind] ??
    `${human.title}. ${EDITORIAL_PROBLEMS.nothingChanged}`
  );
};

export const editorialProblem = (error: unknown): ProblemView => ({
  error,
  message: describeEditorialProblem(error),
});

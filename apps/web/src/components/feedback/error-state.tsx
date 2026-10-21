import { AlertIcon, RefreshIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { FEEDBACK_COPY } from '@/constants/feedback';
import { isApiError } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';

type ErrorStateProps = {
  title: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
};

const describe = (error: unknown): { detail: string; ref: string | null } => {
  if (isApiError(error)) {
    return {
      detail: error.problem.detail ?? error.problem.title,
      ref: error.problem.requestId ?? null,
    };
  }
  return { detail: FEEDBACK_COPY.unknownError, ref: null };
};

/** Renders problem details; never leaks stack traces or raw payloads. */
export function ErrorState({
  title,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const { detail, ref } = describe(error);
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-critical/30 bg-critical/5 p-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      <AlertIcon size={18} className="shrink-0 text-critical" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
        {ref ? (
          <p className="tabular mt-1 font-mono text-micro text-ink-subtle">
            {FEEDBACK_COPY.requestRef(ref)}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button onClick={onRetry} leadingIcon={<RefreshIcon size={14} />}>
          {FEEDBACK_COPY.retry}
        </Button>
      ) : null}
    </div>
  );
}

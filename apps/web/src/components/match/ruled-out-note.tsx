import type { InsightKind } from '@matchiq/contracts';
import { CORRECTION_COPY } from '@/constants/corrections';
import { cn } from '@/lib/cn';

/** Says plainly that a moment was ruled out and taken off air, and why. */
export function RuledOutNote({
  kind,
  reason,
  className,
}: {
  kind: InsightKind;
  reason?: string | null;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        'rounded-md border border-line bg-surface-sunken px-2.5 py-1.5 text-xs text-ink-muted',
        className,
      )}
    >
      <span className="block font-semibold text-warning">
        {CORRECTION_COPY.removed(kind)}
      </span>
      {reason ? (
        <span className="block">{CORRECTION_COPY.why(reason)}</span>
      ) : null}
    </p>
  );
}

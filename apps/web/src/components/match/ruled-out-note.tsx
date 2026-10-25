import type { InsightKind } from '@matchiq/contracts';
import { CORRECTION_COPY } from '@/constants/corrections';
import { cn } from '@/lib/cn';
import { describeReason } from '@/lib/describe-reason';

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
  const stripped = reason?.replace(CORRECTION_COPY.reasonLead, '');
  const why = stripped ? describeReason(stripped) : null;
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
      {why ? <span className="block">{CORRECTION_COPY.why(why)}</span> : null}
    </p>
  );
}

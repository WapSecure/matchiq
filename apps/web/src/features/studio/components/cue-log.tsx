'use client';

import { CAUSE_LABELS, EDITORIAL_CAUSES } from '@/constants/editorial';
import { NATURAL_CUE_ENDS, OVERLAY_COPY } from '@/constants/overlay';
import { cn } from '@/lib/cn';
import { describeReason } from '@/lib/describe-reason';
import { type Retraction, useMatchStore } from '../store';

/**
 * The cause names why a graphic ended. Only a correction's own reason (match
 * data, e.g. "Goal disallowed") is shown; scheduler and editorial reason codes
 * only repeat the label.
 */
const describe = (r: Retraction) => {
  const editorial = r.cause !== null && EDITORIAL_CAUSES.has(r.cause);
  const natural = NATURAL_CUE_ENDS.has(r.reason);
  return {
    label: r.cause ? CAUSE_LABELS[r.cause] : OVERLAY_COPY.ending[r.ending],
    reason: editorial || natural || !r.reason ? null : describeReason(r.reason),
    editorial,
  };
};

/** Recently ended graphics: finished on the match clock, or taken off air with a cause. */
export function CueLog() {
  const ended = useMatchStore((s) => s.retractions);
  if (ended.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="eyebrow mb-1.5">{OVERLAY_COPY.cueLog}</h3>
      <ul className="flex flex-col gap-1 text-xs">
        {ended.map((r) => {
          const view = describe(r);
          return (
            <li
              key={r.overlayId}
              data-cause={r.cause ?? undefined}
              className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-ink-muted"
            >
              <span
                className={cn(
                  'eyebrow',
                  view.editorial && 'text-critical',
                  !view.editorial && r.ending === 'RETRACTED' && 'text-warning',
                  !view.editorial &&
                    r.ending !== 'RETRACTED' &&
                    'text-ink-subtle',
                )}
              >
                {view.label}
              </span>
              <span className="min-w-0 truncate text-ink">
                {r.headline ?? OVERLAY_COPY.untitled}
              </span>
              {view.reason ? (
                <span className="text-ink-subtle">{view.reason}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

'use client';

import { OVERLAY_COPY } from '@/constants/overlay';
import { cn } from '@/lib/cn';
import { useMatchStore } from '../store';

/** Recently ended cues: expired on the match clock, or retracted with a reason. */
export function CueLog() {
  const ended = useMatchStore((s) => s.retractions);
  if (ended.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="eyebrow mb-1.5">{OVERLAY_COPY.cueLog}</h3>
      <ul className="flex flex-col gap-1 text-xs">
        {ended.map((r) => (
          <li
            key={r.overlayId}
            className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-ink-muted"
          >
            <span
              className={cn(
                'eyebrow',
                r.ending === 'RETRACTED' ? 'text-warning' : 'text-ink-subtle',
              )}
            >
              {OVERLAY_COPY.ending[r.ending]}
            </span>
            <span className="min-w-0 truncate text-ink">
              {r.headline ?? r.overlayId}
            </span>
            <span className="text-ink-subtle">{r.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowRightIcon, TrophyIcon } from '@/components/icons';
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { useMatchStore } from '../store';

/** Shown under the scoreboard once the replay or the match data says full time. */
export function FullTimeCallout() {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const ended = useMatchStore(
    (s) => s.replay?.state === 'COMPLETED' || s.snapshot?.phase === 'COMPLETED',
  );
  if (!ended) return null;
  const copy = STUDIO_COPY.fullTime;
  return (
    <div
      data-testid="full-time-callout"
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-4"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent-soft text-accent-strong">
        <TrophyIcon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{copy.title}</p>
        <p className="text-xs text-ink-muted">{copy.body}</p>
      </div>
      <Link
        href={ROUTES.recap(fixtureId)}
        className={cn(BUTTON_BASE, BUTTON_VARIANTS.primary, BUTTON_SIZES.sm)}
      >
        {copy.action}
        <ArrowRightIcon size={14} />
      </Link>
    </div>
  );
}

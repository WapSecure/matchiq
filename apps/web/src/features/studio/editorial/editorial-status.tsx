'use client';

import type { EditorialMode } from '@matchiq/contracts';
import { AlertIcon, FreezeIcon } from '@/components/icons';
import { Badge } from '@/components/ui';
import {
  EDITORIAL_COPY,
  MANUAL_APPROVAL_VIEW,
  MODE_VIEW,
} from '@/constants/editorial';
import { cn } from '@/lib/cn';
import { usePublishPolicy } from '../approval/approval-queue';
import { useMatchStore } from '../store';

/** No `editorial.status` yet means nothing was ever frozen or killed. */
export const useEditorialMode = (): EditorialMode =>
  useMatchStore((s) => s.editorial?.mode ?? 'AUTO');

/** Hidden on narrow screens, where the header has no room and the banner carries the state. */
export function EditorialChip() {
  const mode = useEditorialMode();
  const manual = usePublishPolicy() === 'MANUAL';
  const view =
    mode === 'AUTO' && manual ? MANUAL_APPROVAL_VIEW : MODE_VIEW[mode];
  return (
    <span className="hidden shrink-0 md:flex">
      <Badge tone={view.tone} dot data-testid="editorial-chip">
        <span className="sr-only">{EDITORIAL_COPY.chipPrefix}</span>
        {view.label}
      </Badge>
    </span>
  );
}

const BANNER_TONE = {
  FROZEN: 'border-warning/35 bg-warning/10',
  KILLED: 'border-critical/40 bg-critical/10',
} as const;

/** Persistent while held; `role="status"` announces entering and leaving. */
export function EditorialBanner() {
  const mode = useEditorialMode();
  const held = mode === 'AUTO' ? null : mode;
  return (
    <div role="status">
      {held ? (
        <div
          data-testid="editorial-banner"
          className={cn('border-b', BANNER_TONE[held])}
        >
          <div className="mx-auto flex max-w-[1920px] items-start gap-2.5 px-4 py-2.5 lg:px-6">
            {held === 'KILLED' ? (
              <AlertIcon size={16} className="mt-0.5 shrink-0 text-critical" />
            ) : (
              <FreezeIcon size={16} className="mt-0.5 shrink-0 text-warning" />
            )}
            <p className="text-[13px] leading-snug text-ink">
              <strong className="font-semibold">
                {EDITORIAL_COPY.banner[held].title}.
              </strong>{' '}
              <span className="text-ink-muted">
                {EDITORIAL_COPY.banner[held].body}
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

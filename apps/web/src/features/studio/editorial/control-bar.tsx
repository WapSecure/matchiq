'use client';

import Link from 'next/link';
import { AuditIcon, ShieldIcon } from '@/components/icons';
import {
  Badge,
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
} from '@/components/ui';
import { EDITORIAL_COPY, MODE_VIEW } from '@/constants/editorial';
import { ROUTES } from '@/constants/navigation';
import { cn } from '@/lib/cn';
import { useMatchStore } from '../store';
import { useEditorialMode } from './editorial-status';
import { FreezeControl } from './freeze-control';
import { KillSwitchControl } from './kill-switch-control';

const HEADING_ID = 'editorial-control-title';

const ICON_TONE = {
  AUTO: 'border-line bg-surface-raised text-ink-muted',
  FROZEN: 'border-warning/35 bg-warning/10 text-warning',
  KILLED: 'border-critical/40 bg-critical/10 text-critical',
} as const;

const Divider = () => (
  <span aria-hidden className="hidden h-5 w-px shrink-0 bg-line sm:block" />
);

/**
 * Producer overrides for the session and the organisation. The mode chip
 * lives in the header from `md`; below that it shows here instead.
 */
export function ProducerControlBar() {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const mode = useEditorialMode();
  const view = MODE_VIEW[mode];
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-panel sm:px-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md border',
            ICON_TONE[mode],
          )}
        >
          <ShieldIcon size={15} />
        </span>
        <div className="min-w-0">
          <h2
            id={HEADING_ID}
            className="text-[13px] font-semibold leading-5 tracking-tight text-ink"
          >
            {EDITORIAL_COPY.barTitle}
          </h2>
          <p className="hidden text-xs leading-4 text-ink-subtle lg:block">
            {EDITORIAL_COPY.barDescription}
          </p>
        </div>
        <Badge
          tone={view.tone}
          dot
          data-testid="editorial-mode"
          className="ml-auto md:hidden"
        >
          <span className="sr-only">{EDITORIAL_COPY.chipPrefix}</span>
          {view.label}
        </Badge>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <FreezeControl />
        <KillSwitchControl />
        <Divider />
        <Link
          href={ROUTES.audit(fixtureId)}
          className={cn(BUTTON_BASE, BUTTON_VARIANTS.ghost, BUTTON_SIZES.sm)}
        >
          <AuditIcon size={14} />
          {EDITORIAL_COPY.auditLink}
        </Link>
      </div>
    </section>
  );
}

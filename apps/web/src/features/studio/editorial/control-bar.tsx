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

/** Producer overrides for the session and the organisation. */
export function ProducerControlBar() {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const view = MODE_VIEW[useEditorialMode()];
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-panel"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-raised text-ink-muted">
          <ShieldIcon size={14} />
        </span>
        <div className="min-w-0">
          <h2
            id={HEADING_ID}
            className="text-[13px] font-semibold leading-5 tracking-tight text-ink"
          >
            {EDITORIAL_COPY.barTitle}
          </h2>
          <p className="text-xs leading-4 text-ink-subtle">
            {EDITORIAL_COPY.barDescription}
          </p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="eyebrow">{EDITORIAL_COPY.modeLegend}</span>
        <Badge tone={view.tone} dot data-testid="editorial-mode">
          {view.label}
        </Badge>
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <FreezeControl />
        <KillSwitchControl />
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

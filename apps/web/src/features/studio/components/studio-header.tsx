'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeftIcon, LogoMark } from '@/components/icons';
import { Badge } from '@/components/ui';
import {
  ROUTES,
  STUDIO_TABS,
  STUDIO_TABS_LABEL,
  type StudioView,
} from '@/constants/navigation';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { cn } from '@/lib/cn';

type StudioHeaderProps = {
  fixtureId: string;
  view: StudioView;
  title: string | null;
  competition: string | null;
  /** Live connection indicator; only the live view has a stream. */
  status?: ReactNode;
};

function StudioTabs({
  fixtureId,
  view,
}: {
  fixtureId: string;
  view: StudioView;
}) {
  return (
    <nav
      aria-label={STUDIO_TABS_LABEL}
      className="-mb-px flex gap-1 overflow-x-auto"
    >
      {STUDIO_TABS.map((tab) => {
        const current = tab.view === view;
        return (
          <Link
            key={tab.view}
            href={tab.href(fixtureId)}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
              current
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StudioHeader({
  fixtureId,
  view,
  title,
  competition,
  status,
}: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-[1920px] items-center gap-3 px-4 lg:px-6">
        <Link
          href={ROUTES.fixtures}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <ChevronLeftIcon size={14} />
          {STUDIO_COPY.backToLobby}
        </Link>
        <span aria-hidden className="h-5 w-px bg-line" />
        <LogoMark size={18} className="hidden shrink-0 text-accent sm:block" />
        <div className="min-w-0 flex-1">
          <h1 className="sr-only truncate text-sm font-semibold tracking-tight text-ink sm:not-sr-only">
            {title ?? STUDIO_COPY.title}
          </h1>
          {competition ? (
            <p className="hidden truncate text-micro text-ink-subtle sm:block">
              {competition}
            </p>
          ) : null}
        </div>
        <Badge tone="synthetic" dot data-watermark="">
          {WATERMARK}
        </Badge>
        {status}
      </div>
      <div className="mx-auto max-w-[1920px] px-2 lg:px-4">
        <StudioTabs fixtureId={fixtureId} view={view} />
      </div>
    </header>
  );
}

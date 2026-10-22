'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeftIcon, LogoMark } from '@/components/icons';
import { UserMenu } from '@/components/auth/user-menu';
import { ThemeToggle } from '@/components/layout/theme-toggle';
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
              'relative whitespace-nowrap rounded-t-md px-3 py-2.5 text-[13px] font-medium transition-colors',
              'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full',
              current
                ? 'text-ink after:bg-accent'
                : 'text-ink-muted after:bg-transparent hover:text-ink hover:after:bg-line-strong',
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
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-2 px-4 sm:gap-3 lg:px-6">
        <Link
          href={ROUTES.fixtures}
          className="press flex h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <ChevronLeftIcon size={16} />
          <span className="sr-only sm:not-sr-only">
            {STUDIO_COPY.backToLobby}
          </span>
        </Link>
        <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
        <span className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink shadow-panel sm:flex">
          <LogoMark size={17} />
        </span>
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
        <ThemeToggle />
        {/* At phone width the studio header has no room; the lobby header keeps the account menu. */}
        <div className="hidden sm:block">
          <UserMenu />
        </div>
      </div>
      <div className="mx-auto max-w-[1920px] px-2 lg:px-4">
        <StudioTabs fixtureId={fixtureId} view={view} />
      </div>
    </header>
  );
}

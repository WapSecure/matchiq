'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeftIcon, LogoMark } from '@/components/icons';
import { UserMenu } from '@/components/auth/user-menu';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { MatchCodeChip } from '@/components/match/match-code-chip';
import { Badge, HintBadge } from '@/components/ui';
import { MATCH_CODE_COPY } from '@/constants/match-code';
import {
  ROUTES,
  STUDIO_TABS,
  STUDIO_TABS_LABEL,
  type StudioView,
} from '@/constants/navigation';
import { SYNTHETIC_DISCLOSURE } from '@/constants/site';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { cn } from '@/lib/cn';

type StudioHeaderProps = {
  fixtureId: string;
  view: StudioView;
  title: string | null;
  competition: string | null;
  matchCode?: string | null;
  replay?: number | null;
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
  matchCode = null,
  replay = null,
  status,
}: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex min-h-14 max-w-[1920px] flex-wrap items-center gap-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:gap-3 sm:py-0 lg:px-6">
        <Link
          href={ROUTES.fixtures}
          className="press flex h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <ChevronLeftIcon size={16} />
          <span className="sr-only sm:not-sr-only">
            {STUDIO_COPY.backToLobby}
          </span>
        </Link>
        <span
          aria-hidden
          className="hidden h-5 w-px shrink-0 bg-line sm:block"
        />
        <span className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink shadow-panel sm:flex">
          <LogoMark size={17} />
        </span>
        <div className="order-last w-full min-w-0 pt-2 sm:order-none sm:w-auto sm:flex-1 sm:pt-0">
          <h1 className="break-words text-sm font-semibold tracking-tight text-ink sm:truncate">
            {title ?? STUDIO_COPY.title}
          </h1>
          {competition ? (
            <p className="hidden truncate text-micro text-ink-subtle sm:block">
              {competition}
              {replay ? (
                <span className="lg:hidden">
                  {` · ${MATCH_CODE_COPY.replay(replay)}`}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        {matchCode ? (
          <div className="hidden items-center gap-1.5 lg:flex">
            <MatchCodeChip code={matchCode} compact />
            {replay ? <Badge>{MATCH_CODE_COPY.replay(replay)}</Badge> : null}
          </div>
        ) : null}
        <span
          aria-hidden
          className="hidden h-5 w-px shrink-0 bg-line lg:block"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          {/* The one page-level disclosure; the preview carries its own on-air burn-in. */}
          <HintBadge
            tone="synthetic"
            dot
            hint={SYNTHETIC_DISCLOSURE.text}
            data-watermark=""
          >
            {WATERMARK}
          </HintBadge>
          {status}
        </div>
        <ThemeToggle />
        <UserMenu />
      </div>
      <div className="mx-auto max-w-[1920px] px-2 lg:px-4">
        <StudioTabs fixtureId={fixtureId} view={view} />
      </div>
    </header>
  );
}

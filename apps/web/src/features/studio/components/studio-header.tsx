'use client';

import Link from 'next/link';
import { ChevronLeftIcon, LogoMark } from '@/components/icons';
import { ConnectionStatus } from '@/components/match/connection-status';
import { Badge } from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { CONNECTION_COPY, STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { useMatchStore } from '../store';

type StudioHeaderProps = { title: string | null; competition: string | null };

export function StudioHeader({ title, competition }: StudioHeaderProps) {
  const connection = useMatchStore((s) => s.connection.state);
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
        <ConnectionStatus state={connection} />
      </div>
    </header>
  );
}

export function ConnectionBanner() {
  const state = useMatchStore((s) => s.connection.state);
  const banner = CONNECTION_COPY[state].banner;
  if (!banner) return null;
  return (
    <div
      role="status"
      className={cn(
        'border-b px-4 py-2 text-xs text-ink lg:px-6',
        state === 'offline'
          ? 'border-critical/30 bg-critical/5'
          : 'border-warning/30 bg-warning/5',
      )}
    >
      {banner}
    </div>
  );
}

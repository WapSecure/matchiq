'use client';

import type { ReplayState } from '@matchiq/contracts';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import {
  Badge,
  type BadgeTone,
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
} from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { REPLAY_COPY } from '@/constants/replay';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { useInterfaceLanguage } from '@/features/interface-language/interface-language-store';
import type { ReplaySessionView } from '@/lib/api/session-schemas';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';
import { formatRelative } from '@/lib/format-time';

const NOT_STARTED = -1;

const STATE_TONE: Record<ReplayState, BadgeTone> = {
  IDLE: 'neutral',
  PLAYING: 'onair',
  PAUSED: 'warning',
  COMPLETED: 'neutral',
};

type SessionRowProps = {
  session: ReplaySessionView;
  code: string | undefined;
  now: number;
};

export function SessionRow({ session, code, now }: SessionRowProps) {
  const copy = usePageMessages().lobby.sessions;
  const locale = useInterfaceLanguage((state) => state.locale);
  const { status } = session;
  const minute =
    status.appliedSequence === NOT_STARTED
      ? copy.notStarted
      : formatMinute(status.period, status.matchClockMs);
  return (
    <li className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-raised/50 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="min-w-0 sm:flex-1">
        <p className="truncate text-sm font-medium text-ink">{session.title}</p>
        <p className="tabular truncate font-mono text-micro text-ink-subtle">
          {copy.replay(session.sessionNumber)}
          {code ? ` · ${code}` : ''}
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <Badge tone={STATE_TONE[status.state]} dot>
          {copy.state[status.state]}
        </Badge>
        <div className="tabular min-w-0 text-xs leading-tight sm:w-28">
          <p className="text-ink-muted">
            {minute} · {REPLAY_COPY.speedOption(status.speed)}
          </p>
          <time
            dateTime={session.updatedAt}
            className="block text-micro text-ink-subtle"
          >
            {formatRelative(
              session.updatedAt,
              Math.max(now, Date.parse(session.updatedAt)),
              'short',
              locale,
            )}
          </time>
        </div>
        <Link
          href={ROUTES.studio(session.sessionId)}
          aria-label={copy.openLabel(session.title, session.sessionNumber)}
          className={cn(
            BUTTON_BASE,
            BUTTON_VARIANTS.secondary,
            BUTTON_SIZES.sm,
            'ml-auto sm:ml-0',
          )}
        >
          {copy.open}
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    </li>
  );
}

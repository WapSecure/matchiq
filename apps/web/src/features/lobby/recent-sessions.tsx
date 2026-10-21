'use client';

import Link from 'next/link';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ArrowRightIcon, TimelineIcon } from '@/components/icons';
import {
  Badge,
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Panel,
  Skeleton,
} from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { ROUTES } from '@/constants/navigation';
import { REPLAY_COPY } from '@/constants/replay';
import { useSessions } from '@/lib/api/hooks';
import type { ReplaySessionView } from '@/lib/api/session-schemas';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';

const copy = LOBBY_COPY.sessions;
const NOT_STARTED = -1;

function SessionRow({ session }: { session: ReplaySessionView }) {
  const { status } = session;
  const live = status.state === 'PLAYING';
  const minute =
    status.appliedSequence === NOT_STARTED
      ? copy.notStarted
      : formatMinute(status.period, status.matchClockMs);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="truncate text-sm font-medium text-ink">{session.title}</p>
        <p className="tabular font-mono text-micro text-ink-subtle">
          {copy.number(session.sessionNumber)} · {session.sessionId}
        </p>
      </div>
      <Badge tone={live ? 'accent' : 'neutral'} dot={live}>
        {REPLAY_COPY.state[status.state]}
      </Badge>
      <span className="tabular w-24 text-xs text-ink-muted">
        {minute} · {REPLAY_COPY.speedOption(status.speed)}
      </span>
      <Link
        href={ROUTES.studio(session.sessionId)}
        aria-label={copy.openLabel(session.title, session.sessionNumber)}
        className={cn(BUTTON_BASE, BUTTON_VARIANTS.secondary, BUTTON_SIZES.sm)}
      >
        {copy.open}
        <ArrowRightIcon size={14} />
      </Link>
    </li>
  );
}

function SessionsBody() {
  const sessions = useSessions();
  if (sessions.isPending) {
    return (
      <div role="status" aria-label={copy.loading} className="p-4">
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (sessions.isError) {
    return (
      <ErrorState
        className="m-4"
        title={copy.error}
        error={sessions.error}
        onRetry={() => void sessions.refetch()}
      />
    );
  }
  if (sessions.data.length === 0) {
    return <EmptyState compact Icon={TimelineIcon} title={copy.empty} />;
  }
  return (
    <ul aria-label={copy.listLabel} className="divide-y divide-line">
      {sessions.data.map((session) => (
        <SessionRow key={session.sessionId} session={session} />
      ))}
    </ul>
  );
}

export function RecentSessions() {
  return (
    <Panel
      id="recent-sessions"
      title={copy.title}
      description={copy.description}
      Icon={TimelineIcon}
      bodyClassName="p-0"
    >
      <SessionsBody />
    </Panel>
  );
}

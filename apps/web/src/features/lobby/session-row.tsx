import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import {
  Badge,
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
} from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { MATCH_CODE_COPY } from '@/constants/match-code';
import { ROUTES } from '@/constants/navigation';
import { REPLAY_COPY } from '@/constants/replay';
import type { ReplaySessionView } from '@/lib/api/session-schemas';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';

const copy = LOBBY_COPY.sessions;
const NOT_STARTED = -1;

export function SessionRow({
  session,
  code,
}: {
  session: ReplaySessionView;
  code: string | undefined;
}) {
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
          {MATCH_CODE_COPY.replay(session.sessionNumber)}
          {code ? ` · ${code}` : ''}
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

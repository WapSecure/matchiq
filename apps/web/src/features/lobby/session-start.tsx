'use client';

import { REPLAY_SPEEDS, ReplaySpeed } from '@matchiq/contracts';
import { useId, useState } from 'react';
import { PlayIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { HTTP_STATUS } from '@/constants/api';
import { LOBBY_COPY } from '@/constants/lobby';
import { REPLAY_COPY } from '@/constants/replay';
import { useStudioUi } from '@/features/studio/store';
import { isApiError } from '@/lib/api/api-error';
import { useStartSession } from './use-start-session';

const failureText = (error: unknown): string => {
  if (isApiError(error) && error.status === HTTP_STATUS.tooManyRequests)
    return LOBBY_COPY.rateLimited;
  const detail = error instanceof Error ? error.message : '';
  return `${LOBBY_COPY.startFailed}${detail ? `: ${detail}` : ''}`;
};

type SessionStartProps = { templateId: string; title: string };

/** Speed picker and Start: creates a session and opens its studio. */
export function SessionStart({ templateId, title }: SessionStartProps) {
  const speedId = useId();
  const errorId = useId();
  const [speed, setSpeed] = useState<ReplaySpeed>(
    () => useStudioUi.getState().speed,
  );
  const session = useStartSession();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={speedId} className="sr-only">
        {LOBBY_COPY.speedFor(title)}
      </label>
      <select
        id={speedId}
        value={speed}
        onChange={(e) => {
          const parsed = ReplaySpeed.safeParse(Number(e.target.value));
          if (parsed.success) setSpeed(parsed.data);
        }}
        className="tabular h-8 rounded-md border border-line-strong bg-surface-raised px-2 text-sm text-ink"
      >
        {REPLAY_SPEEDS.map((s) => (
          <option key={s} value={s}>
            {REPLAY_COPY.speedOption(s)}
          </option>
        ))}
      </select>
      <Button
        variant="primary"
        onClick={() => session.start(templateId, speed)}
        disabled={session.pending}
        aria-label={LOBBY_COPY.startLabel(title)}
        aria-describedby={session.error ? errorId : undefined}
        leadingIcon={<PlayIcon size={14} />}
        className="ml-auto"
      >
        {session.pending ? LOBBY_COPY.starting : LOBBY_COPY.start}
      </Button>
      {session.error ? (
        <p id={errorId} role="alert" className="w-full text-xs text-critical">
          {failureText(session.error)}
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { REPLAY_SPEEDS, ReplaySpeed } from '@matchiq/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { PlayIcon } from '@/components/icons';
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Button,
} from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { ROUTES } from '@/constants/navigation';
import { REPLAY_COPY } from '@/constants/replay';
import { useStudioUi } from '@/features/studio/store';
import { useReplayCommand } from '@/lib/api/hooks';
import { cn } from '@/lib/cn';

/** Speed picker plus start CTA; navigates to the studio once the API accepts. */
export function StartReplay({ fixtureId }: { fixtureId: string }) {
  const router = useRouter();
  const speedId = useId();
  const setSpeed = useStudioUi((s) => s.setSpeed);
  const [speed, setLocalSpeed] = useState<ReplaySpeed>(
    () => useStudioUi.getState().speed,
  );
  const start = useReplayCommand(fixtureId);
  const studioHref = ROUTES.studio(fixtureId);

  const onStart = () => {
    setSpeed(speed);
    start.mutate(
      { action: 'start', speed },
      { onSuccess: () => router.push(studioHref) },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={speedId} className="sr-only">
        {LOBBY_COPY.speedLabel}
      </label>
      <select
        id={speedId}
        value={speed}
        onChange={(e) => {
          const parsed = ReplaySpeed.safeParse(Number(e.target.value));
          if (parsed.success) setLocalSpeed(parsed.data);
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
        onClick={onStart}
        disabled={start.isPending}
        leadingIcon={<PlayIcon size={14} />}
      >
        {start.isPending ? LOBBY_COPY.starting : LOBBY_COPY.start}
      </Button>
      <Link
        href={studioHref}
        className={cn(
          BUTTON_BASE,
          BUTTON_VARIANTS.ghost,
          BUTTON_SIZES.sm,
          'ml-auto',
        )}
      >
        {LOBBY_COPY.openStudio}
      </Link>
      {start.isError ? (
        <p role="alert" className="w-full text-xs text-critical">
          {LOBBY_COPY.startFailed}: {start.error.message}
        </p>
      ) : null}
    </div>
  );
}

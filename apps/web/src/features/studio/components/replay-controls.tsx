'use client';

import { REPLAY_SPEEDS, type ReplaySpeed } from '@matchiq/contracts';
import { useState } from 'react';
import { PauseIcon, PlayIcon, RestartIcon } from '@/components/icons';
import { Button, SegmentedControl } from '@/components/ui';
import { REPLAY_COPY } from '@/constants/replay';
import { useReplayTransport } from '../hooks/use-replay-transport';
import { useMatchStore } from '../store';

const SPEED_OPTIONS = REPLAY_SPEEDS.map((value) => ({
  value,
  label: REPLAY_COPY.speedOption(value),
}));

function SeekBar({
  max,
  value,
  onCommit,
  disabled,
}: {
  max: number;
  value: number;
  onCommit: (v: number) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;
  const commit = () => {
    if (draft !== null) onCommit(draft);
    setDraft(null);
  };
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3">
      <span className="sr-only">{REPLAY_COPY.seek}</span>
      <input
        type="range"
        min={0}
        max={Math.max(max, 0)}
        value={Math.min(shown, Math.max(max, 0))}
        disabled={disabled || max <= 0}
        aria-valuetext={REPLAY_COPY.seekValue(shown, max)}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent)] disabled:cursor-not-allowed"
      />
    </label>
  );
}

export function ReplayControls({ fixtureId }: { fixtureId: string }) {
  const t = useReplayTransport(fixtureId);
  const applied = useMatchStore((s) => s.lastEventSequence);
  const stateLabel = t.replay
    ? REPLAY_COPY.state[t.replay.state]
    : REPLAY_COPY.unknownState;
  const PrimaryIcon = t.primary === 'pause' ? PauseIcon : PlayIcon;
  return (
    <div
      role="group"
      aria-label={REPLAY_COPY.region}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={t.runPrimary}
          disabled={t.pending}
          leadingIcon={<PrimaryIcon size={14} />}
        >
          {REPLAY_COPY[t.primary]}
        </Button>
        <Button
          iconOnly
          aria-label={REPLAY_COPY.restart}
          onClick={() => t.seek(0)}
          disabled={t.pending || !t.replay}
          leadingIcon={<RestartIcon size={14} />}
        />
        <SegmentedControl<ReplaySpeed>
          legend={REPLAY_COPY.speed}
          hideLegend
          options={SPEED_OPTIONS}
          value={t.speed}
          onChange={t.changeSpeed}
          disabled={t.pending}
        />
        <p role="status" className="tabular ml-auto text-xs text-ink-muted">
          {t.pending
            ? REPLAY_COPY.pending
            : `${stateLabel} · ${REPLAY_COPY.speedOption(t.speed)}`}
        </p>
      </div>
      <SeekBar
        max={Math.max(applied, t.replay?.appliedSequence ?? -1)}
        value={Math.max(applied, 0)}
        onCommit={t.seek}
        disabled={t.pending || !t.replay}
      />
      {t.error ? (
        <p role="alert" className="text-xs text-critical">
          {REPLAY_COPY.failed}: {t.error.message}
        </p>
      ) : null}
    </div>
  );
}

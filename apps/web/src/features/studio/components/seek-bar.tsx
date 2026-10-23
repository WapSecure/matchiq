'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { REPLAY_COPY } from '@/constants/replay';
import { SEEK_COMMIT_IDLE_MS } from '@/constants/studio';
import type { SeekMark } from '../lib/seek-marks';
import { SeekLegend, SeekTrack } from './seek-track';

type SeekBarProps = {
  /** Events in the template; the slider is bounded by it. */
  total: number;
  applied: number;
  onCommit: (sequence: number) => void;
  disabled: boolean;
  marks?: readonly SeekMark[];
};

/**
 * Forward-only seek (ADR-0013): the thumb cannot move behind the applied
 * sequence. Keyboard changes commit once input pauses, so holding an arrow key
 * sends one command rather than one per step. The native range keeps the
 * slider semantics; the track, fill and ticks under it are decoration.
 */
export function SeekBar({
  total,
  applied,
  onCommit,
  disabled,
  marks = [],
}: SeekBarProps) {
  const hintId = useId();
  const [draft, setDraft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const max = Math.max(total - 1, 0);
  const floor = Math.max(applied, 0);
  const shown = Math.min(Math.max(draft ?? floor, floor), max);
  const locked = disabled || max <= 0;

  const clearTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const commit = (value: number | null = draft) => {
    clearTimer();
    if (value !== null && value > applied) onCommit(value);
    setDraft(null);
  };
  useEffect(() => clearTimer, []);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="eyebrow shrink-0">
          {REPLAY_COPY.kickOff}
        </span>
        <label className="relative flex h-7 min-w-0 flex-1 items-center pointer-coarse:h-11">
          <span className="sr-only">{REPLAY_COPY.seek}</span>
          <SeekTrack max={max} shown={shown} marks={marks} locked={locked} />
          <input
            type="range"
            min={0}
            max={max}
            value={shown}
            disabled={locked}
            aria-valuetext={REPLAY_COPY.seekValue(shown, total)}
            aria-describedby={hintId}
            onChange={(e) => {
              const next = Math.max(Number(e.target.value), floor);
              setDraft(next);
              clearTimer();
              timer.current = setTimeout(
                () => commit(next),
                SEEK_COMMIT_IDLE_MS,
              );
            }}
            onPointerUp={() => commit()}
            className="scrub-input relative min-w-0 flex-1"
          />
        </label>
        <span aria-hidden className="eyebrow shrink-0">
          {REPLAY_COPY.fullTime}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p id={hintId} className="text-micro text-ink-subtle">
          {REPLAY_COPY.seekHint}
        </p>
        <div className="flex items-center gap-3">
          <SeekLegend marks={marks} />
          <span className="tabular rounded-md border border-line bg-surface-raised px-2 py-0.5 font-mono text-micro text-ink-muted">
            {REPLAY_COPY.seekValue(shown, total)}
          </span>
        </div>
      </div>
    </div>
  );
}

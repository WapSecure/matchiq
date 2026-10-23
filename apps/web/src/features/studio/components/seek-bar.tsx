'use client';

import { type CSSProperties, useEffect, useId, useRef, useState } from 'react';
import { REPLAY_COPY } from '@/constants/replay';
import { SEEK_COMMIT_IDLE_MS } from '@/constants/studio';

const PERCENT = 100;

type SeekBarProps = {
  /** Events in the template; the slider is bounded by it. */
  total: number;
  applied: number;
  onCommit: (sequence: number) => void;
  disabled: boolean;
};

/**
 * Forward-only seek (ADR-0013): the thumb cannot move behind the applied
 * sequence. Keyboard changes commit once input pauses, so holding an arrow key
 * sends one command rather than one per step.
 */
export function SeekBar({ total, applied, onCommit, disabled }: SeekBarProps) {
  const hintId = useId();
  const [draft, setDraft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const max = Math.max(total - 1, 0);
  const floor = Math.max(applied, 0);
  const shown = Math.min(Math.max(draft ?? floor, floor), max);

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
    <div className="flex min-w-0 flex-col gap-1">
      <label className="flex min-w-0 items-center gap-3">
        <span className="sr-only">{REPLAY_COPY.seek}</span>
        <input
          type="range"
          min={0}
          max={max}
          value={shown}
          disabled={disabled || max <= 0}
          aria-valuetext={REPLAY_COPY.seekValue(shown, total)}
          aria-describedby={hintId}
          onChange={(e) => {
            const next = Math.max(Number(e.target.value), floor);
            setDraft(next);
            clearTimer();
            timer.current = setTimeout(() => commit(next), SEEK_COMMIT_IDLE_MS);
          }}
          onPointerUp={() => commit()}
          style={
            {
              '--range-fill': `${max > 0 ? (shown / max) * PERCENT : 0}%`,
            } as CSSProperties
          }
          className="range-input min-w-0 flex-1"
        />
        <span className="tabular shrink-0 font-mono text-micro text-ink-subtle">
          {REPLAY_COPY.seekValue(shown, total)}
        </span>
      </label>
      <p id={hintId} className="text-micro text-ink-subtle">
        {REPLAY_COPY.seekHint}
      </p>
    </div>
  );
}

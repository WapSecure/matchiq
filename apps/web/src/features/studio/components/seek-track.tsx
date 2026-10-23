import { SIDE_BG } from '@/components/match/team-swatch';
import { REPLAY_COPY } from '@/constants/replay';
import { cn } from '@/lib/cn';
import type { SeekMark } from '../lib/seek-marks';

const PERCENT = 100;

type SeekTrackProps = {
  max: number;
  shown: number;
  marks: readonly SeekMark[];
  locked: boolean;
};

const share = (value: number, max: number) =>
  `${max > 0 ? Math.min(value / max, 1) * PERCENT : 0}%`;

const GOAL_TICK = 'h-3.5 w-1 rounded-full ring-2 ring-surface';
const MOMENT_TICK =
  'size-2 rounded-full border-2 border-surface bg-ink-muted shadow-panel';

function Tick({ mark, max }: { mark: SeekMark; max: number }) {
  return (
    <span
      data-seek-mark={mark.kind}
      className={cn(
        'absolute top-1/2 -translate-x-1/2 -translate-y-1/2',
        mark.kind === 'goal'
          ? cn(GOAL_TICK, mark.side ? SIDE_BG[mark.side] : 'bg-ink')
          : MOMENT_TICK,
      )}
      style={{ left: share(mark.sequence, max) }}
    />
  );
}

/**
 * Drawn under a transparent native range. Inset by half the 16px thumb so a
 * tick at sequence n sits exactly under the thumb's centre at n.
 */
export function SeekTrack({ max, shown, marks, locked }: SeekTrackProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line-strong/70',
        locked && 'opacity-60',
      )}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-accent"
        style={{ width: share(shown, max) }}
      />
      {marks.map((mark) => (
        <Tick key={mark.id} mark={mark} max={max} />
      ))}
    </span>
  );
}

/** Explains the tick shapes; shown only when there is something to explain. */
export function SeekLegend({ marks }: { marks: readonly SeekMark[] }) {
  const goals = marks.some((m) => m.kind === 'goal');
  const moments = marks.some((m) => m.kind === 'moment');
  if (!goals && !moments) return null;
  return (
    <span
      aria-hidden
      className="flex items-center gap-3 text-micro text-ink-subtle"
    >
      {goals ? (
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full bg-ink-muted" />
          {REPLAY_COPY.marks.goal}
        </span>
      ) : null}
      {moments ? (
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ink-muted" />
          {REPLAY_COPY.marks.moment}
        </span>
      ) : null}
    </span>
  );
}

import { useId } from 'react';
import { PITCH_COORD_MAX, PITCH_MARK, pitchViewBox } from '@/constants/pitch';
import { cn } from '@/lib/cn';
import type { PitchMark } from './pitch-events';
import { PitchGlyph } from './pitch-glyph';
import { PitchMarkings } from './pitch-markings';

type PitchPlotProps = {
  marks: readonly PitchMark[];
  length: number;
  width: number;
  title: string;
  description: string;
  activeId?: string | null;
  onActivate?: (id: string | null) => void;
  className?: string;
};

const FOLLOWED_RING = 2.2;

/** Goals, then the followed player's marks, draw last so they stay on top. */
const paintOrder = (marks: readonly PitchMark[]) => [
  ...marks.filter((m) => m.kind !== 'GOAL' && !m.followed),
  ...marks.filter((m) => m.kind === 'GOAL' && !m.followed),
  ...marks.filter((m) => m.followed),
];

/** Top-down pitch in metres; marks are positioned from normalised 0..100. */
export function PitchPlot({
  marks,
  length,
  width,
  title,
  description,
  activeId = null,
  onActivate,
  className,
}: PitchPlotProps) {
  const titleId = useId();
  const descId = useId();
  const sx = length / PITCH_COORD_MAX;
  const sy = width / PITCH_COORD_MAX;
  return (
    <svg
      viewBox={pitchViewBox(length, width)}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className={cn('block h-auto w-full rounded-md', className)}
      onPointerLeave={onActivate ? () => onActivate(null) : undefined}
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      <PitchMarkings length={length} width={width} surround />
      <g>
        {paintOrder(marks).map((m) => (
          <g
            key={m.id}
            data-mark={m.kind}
            data-side={m.side}
            data-followed={m.followed || undefined}
            onPointerEnter={onActivate ? () => onActivate(m.id) : undefined}
            className={cn(
              onActivate && 'cursor-crosshair',
              activeId !== null && activeId !== m.id && 'opacity-35',
              'transition-opacity duration-150',
            )}
          >
            {m.followed ? (
              <circle
                cx={m.x * sx}
                cy={m.y * sy}
                r={PITCH_MARK.radius * FOLLOWED_RING}
                fill="none"
                strokeWidth={PITCH_MARK.ring}
                className="stroke-accent"
              />
            ) : null}
            <PitchGlyph
              kind={m.kind}
              side={m.side}
              onTarget={m.onTarget}
              cx={m.x * sx}
              cy={m.y * sy}
              active={m.id === activeId}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

import { useId } from 'react';
import { PITCH_COORD_MAX } from '@/constants/pitch';
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

/** Goals draw last so they sit above shots and recoveries in the same spot. */
const paintOrder = (marks: readonly PitchMark[]) => [
  ...marks.filter((m) => m.kind !== 'GOAL'),
  ...marks.filter((m) => m.kind === 'GOAL'),
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
      viewBox={`0 0 ${length} ${width}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className={cn('block h-auto w-full rounded-md', className)}
      onPointerLeave={onActivate ? () => onActivate(null) : undefined}
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      <PitchMarkings length={length} width={width} />
      <g>
        {paintOrder(marks).map((m) => (
          <g
            key={m.id}
            data-mark={m.kind}
            data-side={m.side}
            onPointerEnter={onActivate ? () => onActivate(m.id) : undefined}
            className={cn(
              onActivate && 'cursor-crosshair',
              activeId !== null && activeId !== m.id && 'opacity-35',
              'transition-opacity duration-150',
            )}
          >
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

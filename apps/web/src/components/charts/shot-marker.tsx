import { SHOT_HIT_RADIUS, DEPTH_COPY } from '@/constants/pitch-depth';
import { cn } from '@/lib/cn';
import type { PitchMark } from './pitch-events';
import { shotRadius } from './pitch-shots';

const FILL = { home: 'fill-home stroke-pitch', away: 'fill-away stroke-pitch' };
const HOLLOW = {
  home: 'fill-pitch stroke-home',
  away: 'fill-pitch stroke-away',
};
const STROKE = { home: 'stroke-home', away: 'stroke-away' };

function LegendDot({ r, hollow }: { r: number; hollow?: boolean }) {
  return (
    <svg aria-hidden viewBox="-3 -3 6 6" className="size-4 shrink-0">
      <circle
        r={r}
        strokeWidth={0.5}
        className={hollow ? 'fill-none stroke-ink-muted' : 'fill-ink-muted'}
      />
    </svg>
  );
}

export function ShotLegend() {
  const c = DEPTH_COPY.shots;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-ink-muted">
      <li className="flex items-center gap-1.5">
        <LegendDot r={2.6} />
        {c.legendGoal}
      </li>
      <li className="flex items-center gap-1.5">
        <LegendDot r={1.8} />
        {c.legendOn}
      </li>
      <li className="flex items-center gap-1.5">
        <LegendDot r={1.25} hollow />
        {c.legendOff}
      </li>
    </ul>
  );
}

type ShotMarkerProps = {
  mark: PitchMark;
  sx: number;
  sy: number;
  activeId: string | null;
  onActivate: (id: string) => void;
};

export function ShotMarker({
  mark: m,
  sx,
  sy,
  activeId,
  onActivate,
}: ShotMarkerProps) {
  const r = shotRadius(m);
  return (
    <g
      data-shot={m.kind}
      data-side={m.side}
      transform={`translate(${m.x * sx} ${m.y * sy})`}
      onPointerEnter={() => onActivate(m.id)}
      onClick={() => onActivate(m.id)}
      className={cn(
        'cursor-pointer transition-opacity duration-150 motion-reduce:transition-none',
        activeId !== null && activeId !== m.id && 'opacity-35',
      )}
    >
      <circle r={SHOT_HIT_RADIUS} fill="transparent" />
      {m.kind === 'GOAL' ? (
        <circle
          r={r + 0.9}
          fill="none"
          strokeWidth={0.35}
          className={STROKE[m.side]}
        />
      ) : null}
      <circle
        r={m.id === activeId ? r * 1.25 : r}
        strokeWidth={0.5}
        className={m.onTarget ? FILL[m.side] : HOLLOW[m.side]}
      />
    </g>
  );
}

'use client';

import { type PointerEvent, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';
import { type MomentumPoint, nearestPoint } from './momentum-geometry';

const PERCENT = 100;
const DECIMALS = 1;
/** Past this share of the width the tooltip flips to the left of the crosshair. */
const FLIP_AT = 60;

type MomentumHoverProps = {
  points: readonly MomentumPoint[];
  homeName: string;
  awayName: string;
};

function Dot({ y, side }: { y: number | null; side: 'home' | 'away' }) {
  if (y === null) return null;
  return (
    <span
      className={cn(
        'absolute left-0 size-2 -translate-x-1/2 -translate-y-1/2 ring-2 ring-surface',
        side === 'home' ? 'rounded-[2px] bg-home' : 'rounded-full bg-away',
      )}
      style={{ top: `${y}%` }}
    />
  );
}

function Row({ name, value }: { name: string; value: number | null }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-ink-muted">{name}</span>
      <span className="tabular font-semibold text-ink">
        {value === null ? '–' : value.toFixed(DECIMALS)}
      </span>
    </p>
  );
}

/**
 * Pointer crosshair with both values. Decorative for assistive technology:
 * the same numbers are in the chart's table view. With no pointer, the
 * latest sample keeps its end markers.
 */
export function MomentumHover({
  points,
  homeName,
  awayName,
}: MomentumHoverProps) {
  const [active, setActive] = useState<MomentumPoint | null>(null);
  const shown = active ?? points[points.length - 1] ?? null;
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / Math.max(box.width, 1)) * PERCENT;
    setActive(nearestPoint(points, x));
  };
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
    >
      {shown ? (
        <div className="absolute inset-y-0" style={{ left: `${shown.x}%` }}>
          {active ? (
            <span className="absolute inset-y-0 left-0 w-px bg-line-strong" />
          ) : null}
          <Dot y={shown.home} side="home" />
          <Dot y={shown.away} side="away" />
          {active ? (
            <div
              className={cn(
                'pointer-events-none absolute top-0 z-10 w-44 rounded-md border border-line bg-surface-raised p-2 text-micro shadow-float',
                active.x > FLIP_AT ? 'right-2' : 'left-2',
              )}
            >
              <p className="tabular mb-1 font-mono text-ink-subtle">
                {formatMinute(active.datum.period, active.datum.clockMs)}
              </p>
              <Row name={homeName} value={active.datum.home} />
              <Row name={awayName} value={active.datum.away} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

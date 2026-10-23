'use client';

import { useId } from 'react';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';
import {
  MOMENTUM_HEIGHT as HEIGHT,
  MOMENTUM_WIDTH as WIDTH,
  momentumGeometry,
  momentumLeader,
} from './momentum-geometry';
import { MomentumHover } from './momentum-hover';
import { Legend, lastValue, SeriesPath } from './momentum-parts';
import { MomentumTable, type MomentumDatum } from './momentum-table';

export type { MomentumDatum } from './momentum-table';

type MomentumChartProps = {
  title: string;
  description: string;
  homeName: string;
  awayName: string;
  data: readonly MomentumDatum[];
  tableLabel: string;
  className?: string;
};

const GRID = [0, HEIGHT / 2, HEIGHT];
const m = STUDIO_COPY.metrics;

function Summary({
  data,
  homeName,
  awayName,
}: Pick<MomentumChartProps, 'data' | 'homeName' | 'awayName'>) {
  const leader = momentumLeader(data, m.momentumLevelMargin);
  if (!leader) return null;
  const text =
    leader === 'level'
      ? m.momentumLevel
      : m.momentumLead(leader === 'home' ? homeName : awayName);
  return <p className="text-sm font-semibold text-ink">{text}</p>;
}

export function MomentumChart({
  title,
  description,
  homeName,
  awayName,
  data,
  tableLabel,
  className,
}: MomentumChartProps) {
  const titleId = useId();
  const descId = useId();
  const geometry = momentumGeometry(data);
  const first = data[0];
  const last = data[data.length - 1];
  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <figcaption className="flex flex-col gap-1.5">
        <span className="eyebrow">{title}</span>
        <Summary data={data} homeName={homeName} awayName={awayName} />
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          <Legend name={homeName} side="home" value={lastValue(data, 'home')} />
          <Legend name={awayName} side="away" value={lastValue(data, 'away')} />
        </ul>
      </figcaption>
      <div className="relative h-32">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="absolute inset-0 size-full overflow-visible"
        >
          <title id={titleId}>{title}</title>
          <desc id={descId}>{description}</desc>
          {GRID.map((y) => (
            <line
              key={y}
              x1={0}
              x2={WIDTH}
              y1={y}
              y2={y}
              className="stroke-line"
              strokeWidth={1}
              strokeDasharray={y === HEIGHT / 2 ? undefined : '2 4'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <SeriesPath d={geometry.home} className="stroke-home" />
          <SeriesPath d={geometry.away} className="stroke-away" dashed />
        </svg>
        <MomentumHover
          points={geometry.points}
          homeName={homeName}
          awayName={awayName}
        />
      </div>
      {first && last ? (
        <div
          aria-hidden
          className="tabular flex justify-between font-mono text-micro text-ink-subtle"
        >
          <span>{formatMinute(first.period, first.clockMs)}</span>
          <span>{formatMinute(last.period, last.clockMs)}</span>
        </div>
      ) : null}
      <MomentumTable
        label={tableLabel}
        homeName={homeName}
        awayName={awayName}
        data={data}
      />
    </figure>
  );
}

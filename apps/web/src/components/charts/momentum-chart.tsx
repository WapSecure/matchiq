import { useId } from 'react';
import { cn } from '@/lib/cn';
import { cumulativeMs, formatMinute } from '@/lib/format';
import { linePath, scale, xDomain, yDomain } from './chart-scale';
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

const WIDTH = 600;
const HEIGHT = 140;
const momentumPaths = (data: readonly MomentumDatum[]) => {
  const xs = data.map((d) => cumulativeMs(d.period, d.clockMs));
  const dx = xDomain(xs);
  const dy = yDomain(data.flatMap((d) => [d.home, d.away]));
  if (!dx || !dy) return { home: '', away: '' };
  const sx = scale(dx, WIDTH);
  const sy = scale(dy, HEIGHT, true);
  const series = (side: 'home' | 'away') =>
    linePath(
      data.map((d, i) => ({ x: xs[i] ?? 0, y: d[side] })),
      sx,
      sy,
    );
  return { home: series('home'), away: series('away') };
};

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
  const paths = momentumPaths(data);
  const first = data[0];
  const last = data[data.length - 1];
  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">{title}</span>
        <ul className="flex flex-wrap gap-3">
          <Legend name={homeName} side="home" value={lastValue(data, 'home')} />
          <Legend name={awayName} side="away" value={lastValue(data, 'away')} />
        </ul>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="h-28 w-full overflow-visible"
      >
        <title id={titleId}>{title}</title>
        <desc id={descId}>{description}</desc>
        {[0, HEIGHT / 2, HEIGHT].map((y) => (
          <line
            key={y}
            x1={0}
            x2={WIDTH}
            y1={y}
            y2={y}
            className="stroke-line"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <SeriesPath d={paths.home} className="stroke-home" />
        <SeriesPath d={paths.away} className="stroke-away" dashed />
      </svg>
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

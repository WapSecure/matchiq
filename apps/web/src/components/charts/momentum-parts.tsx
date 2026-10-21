import { TeamSwatch } from '@/components/match/team-swatch';
import { STUDIO_COPY } from '@/constants/studio';
import type { MomentumDatum } from './momentum-table';

const LAST_DECIMALS = 1;

export const lastValue = (
  data: readonly MomentumDatum[],
  side: 'home' | 'away',
) => {
  for (let i = data.length - 1; i >= 0; i -= 1) {
    const v = data[i]?.[side];
    if (v !== null && v !== undefined) return v.toFixed(LAST_DECIMALS);
  }
  return null;
};

export function Legend({
  name,
  side,
  value,
}: {
  name: string;
  side: 'home' | 'away';
  value: string | null;
}) {
  return (
    <li className="flex items-center gap-1.5 text-xs text-ink-muted">
      <TeamSwatch side={side} />
      <span>{name}</span>
      <span className="text-micro text-ink-subtle">
        {STUDIO_COPY.metrics.lineStyle[side]}
      </span>
      {value ? (
        <span className="tabular font-semibold text-ink">{value}</span>
      ) : null}
    </li>
  );
}

const DASH = '6 4';

export function SeriesPath({
  d,
  className,
  dashed = false,
}: {
  d: string;
  className: string;
  dashed?: boolean;
}) {
  return (
    <path
      d={d}
      fill="none"
      className={className}
      strokeWidth={2}
      strokeDasharray={dashed ? DASH : undefined}
      strokeLinejoin="round"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

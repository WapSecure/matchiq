import type { MetricValue, PossessionBasis } from '@matchiq/contracts';
import { POSSESSION_BASIS_LABELS } from '@/constants/match';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { MetricValueText } from './metric-value';
import { SIDE_BG, TeamSwatch } from './team-swatch';

type PossessionBarProps = {
  label: string;
  homeName: string;
  awayName: string;
  home: MetricValue;
  away: MetricValue;
  basis: PossessionBasis;
};

function SideValue({
  name,
  metric,
  side,
}: {
  name: string;
  metric: MetricValue;
  side: 'home' | 'away';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5',
        side === 'away' && 'items-end text-right',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <TeamSwatch side={side} />
        {name}
      </span>
      <MetricValueText
        metric={metric}
        className="text-xl font-semibold text-ink"
      />
    </div>
  );
}

export function PossessionBar({
  label,
  homeName,
  awayName,
  home,
  away,
  basis,
}: PossessionBarProps) {
  const both = home.status === 'available' && away.status === 'available';
  const homeShare = both ? home.value : 0;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className="text-micro text-ink-subtle">
          {POSSESSION_BASIS_LABELS[basis]}
        </span>
      </figcaption>
      <div className="flex items-end justify-between gap-4">
        <SideValue name={homeName} metric={home} side="home" />
        <SideValue name={awayName} metric={away} side="away" />
      </div>
      {both ? (
        <div
          role="img"
          aria-label={`${homeName} ${formatNumber(home.value, home.unit)}, ${awayName} ${formatNumber(away.value, away.unit)}`}
          className="flex h-2 gap-0.5 overflow-hidden rounded-full"
        >
          <span
            className={cn('rounded-l-full', SIDE_BG.home)}
            style={{ width: `${homeShare}%` }}
          />
          <span className={cn('flex-1 rounded-r-full', SIDE_BG.away)} />
        </div>
      ) : (
        <div
          aria-hidden
          className="h-2 rounded-full border border-dashed border-line-strong"
        />
      )}
    </figure>
  );
}

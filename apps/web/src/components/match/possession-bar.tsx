import type { MetricValue, PossessionBasis } from '@matchiq/contracts';
import { POSSESSION_BASIS_LABELS } from '@/constants/match';
import { cn } from '@/lib/cn';
import { formatSharePair } from '@/lib/format';
import { MetricValueText } from './metric-value';
import { SIDE_BG, TeamSwatch } from './team-swatch';

const VALUE_CLASS = 'text-xl font-semibold text-ink';

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
  share,
  side,
}: {
  name: string;
  metric: MetricValue;
  share: string | undefined;
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
      {share === undefined ? (
        <MetricValueText metric={metric} className={VALUE_CLASS} />
      ) : (
        <span className={cn('tabular', VALUE_CLASS)}>{share}</span>
      )}
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
  const shares = formatSharePair(home, away);
  const homeShare = home.status === 'available' ? home.value : 0;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className="text-micro text-ink-subtle">
          {POSSESSION_BASIS_LABELS[basis]}
        </span>
      </figcaption>
      <div className="flex items-end justify-between gap-4">
        <SideValue
          name={homeName}
          metric={home}
          share={shares?.[0]}
          side="home"
        />
        <SideValue
          name={awayName}
          metric={away}
          share={shares?.[1]}
          side="away"
        />
      </div>
      {shares ? (
        <div
          role="img"
          aria-label={`${homeName} ${shares[0]}, ${awayName} ${shares[1]}`}
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

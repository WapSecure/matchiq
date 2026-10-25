import type { Insight, Persona } from '@matchiq/contracts';
import { memo } from 'react';
import { RuledOutNote } from '@/components/match/ruled-out-note';
import { TeamSwatch } from '@/components/match/team-swatch';
import { Badge } from '@/components/ui';
import { INSIGHT_KIND_LABELS, PRIORITY_LABELS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { describeMetric } from '@/lib/metric-definition';
import { formatFraction, formatMinute } from '@/lib/format';
import type { InsightMark } from '../editorial/insight-marks';
import type { RosterTeam } from '../lib/roster';
import type { NarrativeView } from '../store';
import { MomentFooter } from './moment-footer';
import { NarrativePanel } from './narrative-panel';

export type KeyMomentCardProps = {
  insight: Insight;
  view: NarrativeView | null;
  persona: Persona;
  locale: string;
  team: RosterTeam | null;
  mark: InsightMark;
  onOpenEvidence: (insightId: string) => void;
};

const METRIC_DECIMALS = 1;

const PRIORITY_RAIL: Record<Insight['priority'], string> = {
  P0: 'shadow-[inset_3px_0_0_var(--mq-accent)]',
  P1: 'shadow-[inset_3px_0_0_var(--mq-line-strong)]',
  P2: '',
};

function AnalystFacts({ insight }: { insight: Insight }) {
  const metrics = Object.entries(insight.evidence.computedMetrics);
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-line bg-surface-sunken p-2 text-xs">
      {metrics.map(([ref, value]) => (
        <div key={ref} className="flex min-w-0 justify-between gap-2">
          <dt className="min-w-0 break-words text-ink-subtle">
            {describeMetric(ref).label}
          </dt>
          <dd className="tabular font-semibold text-ink">
            {Number.isInteger(value) ? value : value.toFixed(METRIC_DECIMALS)}
          </dd>
        </div>
      ))}
      <div className="col-span-2 flex justify-between gap-2 border-t border-line pt-1">
        <dt className="text-ink-subtle">{STUDIO_COPY.insights.coverage}</dt>
        <dd className="tabular text-ink">
          {formatFraction(insight.evidence.dataCoverage)}
        </dd>
      </div>
    </dl>
  );
}

export const KeyMomentCard = memo(function KeyMomentCard({
  insight,
  view,
  persona,
  locale,
  team,
  mark,
  onOpenEvidence,
}: KeyMomentCardProps) {
  const headline =
    view?.narrative.headline ?? INSIGHT_KIND_LABELS[insight.kind];
  return (
    <article
      aria-label={headline}
      className={cn(
        'flex flex-col gap-2.5 border-b border-line px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-raised/50',
        PRIORITY_RAIL[insight.priority],
        (mark.suppressed || mark.retracted) && 'bg-surface-sunken/60',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Badge tone={insight.priority === 'P0' ? 'accent' : 'neutral'}>
          {PRIORITY_LABELS[insight.priority]}
        </Badge>
        <span className="text-xs font-medium text-ink">
          {INSIGHT_KIND_LABELS[insight.kind]}
        </span>
        {team ? (
          <span className="inline-flex items-center gap-1 font-mono text-micro font-semibold text-ink-muted">
            <TeamSwatch side={team.side} className="size-2" />
            {team.shortName}
          </span>
        ) : null}
        {mark.labels.map((label) => (
          <Badge key={label} tone="warning">
            {label}
          </Badge>
        ))}
        <span className="tabular ml-auto font-mono text-xs text-ink-subtle">
          {formatMinute(insight.period, insight.matchClockMs)}
        </span>
      </header>
      {mark.retracted ? (
        <RuledOutNote kind={insight.kind} reason={mark.retractedReason} />
      ) : (
        <NarrativePanel
          insight={insight}
          view={view}
          locale={locale}
          persona={persona}
          clamp={persona === 'BROADCAST'}
        />
      )}
      {persona === 'ANALYST' ? <AnalystFacts insight={insight} /> : null}
      <MomentFooter
        insight={insight}
        view={view}
        mark={mark}
        headline={headline}
        onOpenEvidence={onOpenEvidence}
      />
    </article>
  );
});

'use client';

import { MomentumChart } from '@/components/charts/momentum-chart';
import { EmptyState } from '@/components/feedback';
import { ChartIcon } from '@/components/icons';
import { PossessionBar } from '@/components/match/possession-bar';
import { StatComparison } from '@/components/match/stat-comparison';
import { Panel, Skeleton } from '@/components/ui';
import { STUDIO_COPY } from '@/constants/studio';
import { statRows } from '../lib/stat-rows';
import { useMatchStore } from '../store';

type LiveMetricsProps = {
  homeName: string;
  awayName: string;
  className?: string;
};

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-hidden>
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

export function LiveMetrics({
  homeName,
  awayName,
  className,
}: LiveMetricsProps) {
  const snapshot = useMatchStore((s) => s.snapshot);
  const statePending = useMatchStore((s) => !s.hydrated);
  const momentum = useMatchStore((s) => s.momentum);
  const m = STUDIO_COPY.metrics;
  return (
    <Panel id="metrics" title={m.title} Icon={ChartIcon} className={className}>
      {snapshot ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1.6fr]">
          <PossessionBar
            label={m.possession}
            homeName={homeName}
            awayName={awayName}
            home={snapshot.home.possessionPct}
            away={snapshot.away.possessionPct}
            basis={snapshot.home.possessionBasis}
          />
          <div>
            <p className="eyebrow mb-1">{m.comparison}</p>
            <StatComparison
              caption={m.comparison}
              homeName={homeName}
              awayName={awayName}
              rows={statRows(snapshot)}
            />
          </div>
          {momentum.length > 0 ? (
            <MomentumChart
              className="md:col-span-2 xl:col-span-1"
              title={m.momentum}
              description={m.momentumDescription}
              homeName={homeName}
              awayName={awayName}
              data={momentum}
              tableLabel={m.tableToggle}
            />
          ) : (
            <EmptyState
              compact
              title={m.momentumEmpty}
              className="md:col-span-2 xl:col-span-1"
            />
          )}
        </div>
      ) : statePending ? (
        <MetricsSkeleton />
      ) : (
        <EmptyState compact title={m.awaiting} />
      )}
    </Panel>
  );
}

import type { Fixture } from '@matchiq/contracts';
import { ChartIcon } from '@/components/icons';
import { PossessionBar } from '@/components/match/possession-bar';
import { StatComparison } from '@/components/match/stat-comparison';
import { Panel } from '@/components/ui';
import { RECAP_COPY } from '@/constants/recap';
import { STUDIO_COPY } from '@/constants/studio';
import { statRows } from '@/features/studio/lib/stat-rows';
import type { RecapDocument } from '@/lib/api/session-schemas';

/** Final engine snapshot; identical for every persona and locale. */
export function FinalMetrics({
  recap,
  fixture,
}: {
  recap: RecapDocument;
  fixture: Fixture;
}) {
  const s = recap.finalSnapshot;
  const m = STUDIO_COPY.metrics;
  return (
    <Panel id="recap-metrics" title={RECAP_COPY.metricsTitle} Icon={ChartIcon}>
      <div className="flex flex-col gap-6">
        <PossessionBar
          label={m.possession}
          homeName={fixture.home.name}
          awayName={fixture.away.name}
          home={s.home.possessionPct}
          away={s.away.possessionPct}
          basis={s.home.possessionBasis}
        />
        <StatComparison
          caption={RECAP_COPY.metricsTitle}
          homeName={fixture.home.name}
          awayName={fixture.away.name}
          rows={statRows(s)}
        />
      </div>
    </Panel>
  );
}

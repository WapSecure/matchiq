'use client';

import { EmptyState } from '@/components/feedback';
import { SparkIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { STUDIO_COPY } from '@/constants/studio';
import { useInsightMarks } from '../editorial/use-insight-marks';
import type { Roster } from '../lib/roster';
import { selectNarrative, useMatchStore, useStudioUi } from '../store';
import { KeyMomentCard } from './key-moment-card';

export function InsightFeed({
  roster,
  className,
}: {
  roster: Roster;
  className?: string;
}) {
  const insights = useMatchStore((s) => s.insights);
  const narratives = useMatchStore((s) => s.narratives);
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const openEvidence = useStudioUi((s) => s.openEvidence);
  const markOf = useInsightMarks();

  return (
    <Panel
      id="insights"
      title={STUDIO_COPY.insights.title}
      description={STUDIO_COPY.insights.description}
      Icon={SparkIcon}
      className={className}
      bodyClassName="p-0"
      scrollable
    >
      {insights.length === 0 ? (
        <EmptyState compact title={STUDIO_COPY.insights.empty} />
      ) : (
        <div>
          {insights.map((insight) => (
            <KeyMomentCard
              key={insight.insightId}
              insight={insight}
              view={selectNarrative(
                { narratives },
                insight.insightId,
                persona,
                locale,
              )}
              persona={persona}
              locale={locale}
              team={roster.team(insight.teamId)}
              mark={markOf(insight.insightId)}
              onOpenEvidence={openEvidence}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

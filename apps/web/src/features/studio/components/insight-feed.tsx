'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback';
import { SparkIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { LoadMore } from '@/components/ui/pagination';
import { PAGE_SIZES, PAGINATION_NOUNS } from '@/constants/pagination';
import { STUDIO_COPY } from '@/constants/studio';
import {
  biasesFavourite,
  favouriteFirst,
} from '@/features/preferences/favourite-first';
import { FavouriteFrame } from '@/features/preferences/favourite-frame';
import { usePreferences } from '@/features/preferences/preferences-store';
import { useInsightMarks } from '../editorial/use-insight-marks';
import type { Roster } from '../lib/roster';
import { selectNarrative, useMatchStore, useStudioUi } from '../store';
import { AudienceBar } from './audience-controls';
import { KeyMomentCard } from './key-moment-card';

export function InsightFeed({
  roster,
  className,
}: {
  roster: Roster;
  className?: string;
}) {
  const all = useMatchStore((s) => s.insights);
  const narratives = useMatchStore((s) => s.narratives);
  const persona = useStudioUi((s) => s.persona);
  const favourite = usePreferences((s) => s.favouriteTeamId);
  const biased = biasesFavourite(persona, favourite);
  const insights = useMemo(
    () => (biased ? favouriteFirst(all, favourite) : all),
    [all, biased, favourite],
  );
  const locale = useStudioUi((s) => s.locale);
  const openEvidence = useStudioUi((s) => s.openEvidence);
  const markOf = useInsightMarks();
  // Newest first and bounded per match, so a client-side window is enough;
  // virtualising would break find-in-page and the screen-reader reading order.
  const [limit, setLimit] = useState<number>(PAGE_SIZES.feed);

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
      <AudienceBar variant="toolbar" className="sticky top-0 z-10" />
      {insights.length === 0 ? (
        <EmptyState compact title={STUDIO_COPY.insights.empty} />
      ) : (
        <div>
          {insights.slice(0, limit).map((insight) => (
            <FavouriteFrame
              key={insight.insightId}
              active={biased && insight.teamId === favourite}
            >
              <KeyMomentCard
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
            </FavouriteFrame>
          ))}
          {insights.length > PAGE_SIZES.feed ? (
            <LoadMore
              className="border-t border-line px-4 py-3"
              shown={Math.min(limit, insights.length)}
              total={insights.length}
              hasMore={limit < insights.length}
              onLoadMore={() => setLimit((n) => n + PAGE_SIZES.feed)}
              noun={PAGINATION_NOUNS.moments}
              label={STUDIO_COPY.insights.moreLabel}
            />
          ) : null}
        </div>
      )}
    </Panel>
  );
}

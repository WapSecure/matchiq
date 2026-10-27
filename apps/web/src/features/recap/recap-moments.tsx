'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { EmptyState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { RECAP_COPY } from '@/constants/recap';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { MinuteStrip } from '@/features/observatory/minute-strip';
import { buildRoster } from '@/features/studio/lib/roster';
import { useStudioUi } from '@/features/studio/store';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { cumulativeMs, formatMinute } from '@/lib/format';
import { pickNarrative } from './pick-narrative';
import { RecapMomentItem } from './recap-moment';
import { momentAnchor, orderedMoments } from './recap-order';

/** Key moments on a match-clock strip, then as a vertical timeline. */
export function RecapMoments({
  recap,
  fixture,
}: {
  recap: RecapDocument;
  fixture: Fixture;
}) {
  const state = usePageMessages().states.recap;
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const roster = useMemo(() => buildRoster(fixture), [fixture]);
  const ordered = orderedMoments(recap.keyMoments);
  const markers = ordered.map((m) => {
    const side = roster.team(m.teamId)?.side;
    const headline =
      pickNarrative(m.narratives, persona, locale)?.narrative.headline ??
      INSIGHT_KIND_LABELS[m.kind];
    return {
      id: m.insightId,
      atMs: cumulativeMs(m.period, m.matchClockMs),
      href: `#${momentAnchor(m.insightId)}`,
      label: RECAP_COPY.marker(
        formatMinute(m.period, m.matchClockMs),
        headline,
      ),
      tone: side ?? ('standard' as const),
      emphasis: m.priority === 'P0',
    };
  });
  return (
    <Panel
      id="recap-moments"
      title={RECAP_COPY.momentsTitle}
      description={RECAP_COPY.momentsDescription}
      Icon={TimelineIcon}
      bodyClassName="p-0"
    >
      {ordered.length === 0 ? (
        <EmptyState compact title={state.momentsEmpty} />
      ) : (
        <>
          <div className="border-b border-line px-4 pt-3">
            <MinuteStrip markers={markers} label={RECAP_COPY.stripLabel} />
          </div>
          <ol aria-label={RECAP_COPY.momentsTitle} className="py-1">
            {ordered.map((moment) => (
              <RecapMomentItem
                key={moment.insightId}
                moment={moment}
                team={roster.team(moment.teamId)}
                persona={persona}
                locale={locale}
                fixtureId={fixture.fixtureId}
              />
            ))}
          </ol>
        </>
      )}
    </Panel>
  );
}

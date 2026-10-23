'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/feedback';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { TimelineIcon } from '@/components/icons';
import { EventTicker } from '@/components/match/event-ticker';
import { Panel, Switch } from '@/components/ui';
import { LoadMore } from '@/components/ui/pagination';
import {
  HEADLINE_EVENT_TYPES,
  KEY_EVENT_TYPES,
  PERIOD_LABELS,
} from '@/constants/match';
import { CORRECTION_COPY } from '@/constants/corrections';
import { PLAYER_FOCUS_COPY } from '@/constants/player-focus';
import { STUDIO_COPY } from '@/constants/studio';
import { useFollowedRows } from '@/features/player-focus/use-followed-rows';
import { useTickerRows } from '../hooks/use-ticker-rows';
import { useTimelineEvents } from '../hooks/use-timeline-events';
import type { Roster } from '../lib/roster';
import { useMatchStore } from '../store';

const copy = STUDIO_COPY.timeline;

const periodLabel = (period: number): string =>
  PERIOD_LABELS[period] ?? copy.period(period);

/**
 * Newest first. The window grows from the top, so a live insert pushes the
 * oldest row out of view rather than moving what the reader is looking at;
 * the scroll body's native scroll anchoring holds the position when scrolled.
 */
export function TimelinePanel({
  roster,
  className,
}: {
  roster: Roster;
  className?: string;
}) {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const voided = useMatchStore((s) => s.voided);
  const [all, setAll] = useState(false);
  const [limit, setLimit] = useState<number>(copy.pageSize);
  const older = useTimelineEvents(fixtureId);
  const rows = useFollowedRows(
    useTickerRows(
      older.events,
      voided,
      roster,
      all ? KEY_EVENT_TYPES : HEADLINE_EVENT_TYPES,
    ),
    older.events,
    (id) => roster.player(id) !== null,
  );
  const shown = Math.min(limit, rows.length);
  const more = () => {
    setLimit((n) => n + copy.pageSize);
    if (limit + copy.pageSize >= rows.length && older.hasOlder)
      void older.loadOlder();
  };

  return (
    <Panel
      id="timeline"
      title={copy.title}
      description={all ? copy.descriptionAll : copy.description}
      Icon={TimelineIcon}
      className={className}
      bodyClassName="p-0 [overflow-anchor:auto]"
      scrollable
      actions={
        <Switch isSelected={all} onChange={setAll}>
          <span className="text-xs">{copy.showAll}</span>
        </Switch>
      }
    >
      {rows.length === 0 && !older.hasOlder ? (
        <EmptyState
          compact
          title={older.events.length === 0 ? copy.empty : copy.emptyKey}
        />
      ) : (
        <>
          <EventTicker
            rows={rows.slice(0, limit)}
            label={copy.title}
            voidedLabel={copy.voided}
            voidedGoalLabel={CORRECTION_COPY.voidedGoal}
            periodLabel={periodLabel}
            followedLabel={PLAYER_FOCUS_COPY.followedMark}
          />
          {older.error ? (
            <div className="px-4 pt-2">
              <InlineProblem error={older.error} lead={copy.loadFailed} />
            </div>
          ) : null}
          <LoadMore
            className="border-t border-line px-4 py-3"
            shown={shown}
            total={older.hasOlder ? undefined : rows.length}
            hasMore={limit < rows.length || older.hasOlder}
            isLoading={older.loading}
            onLoadMore={more}
            noun={copy.noun}
            label={copy.moreLabel}
          />
        </>
      )}
    </Panel>
  );
}

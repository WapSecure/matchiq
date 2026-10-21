'use client';

import { EmptyState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { EventTicker } from '@/components/match/event-ticker';
import { Panel } from '@/components/ui';
import { STUDIO_COPY } from '@/constants/studio';
import { useTickerRows } from '../hooks/use-ticker-rows';
import type { Roster } from '../lib/roster';
import { useMatchStore } from '../store';

export function TimelinePanel({
  roster,
  className,
}: {
  roster: Roster;
  className?: string;
}) {
  const timeline = useMatchStore((s) => s.timeline);
  const voided = useMatchStore((s) => s.voided);
  const count = useMatchStore((s) => s.lastEventSequence + 1);
  const rows = useTickerRows(timeline, voided, roster);

  return (
    <Panel
      id="timeline"
      title={STUDIO_COPY.timeline.title}
      description={STUDIO_COPY.timeline.description}
      Icon={TimelineIcon}
      className={className}
      bodyClassName="p-0"
      scrollable
      actions={
        <span className="tabular text-micro text-ink-subtle">
          {STUDIO_COPY.timeline.count(count)}
        </span>
      }
    >
      {rows.length === 0 ? (
        <EmptyState compact title={STUDIO_COPY.timeline.empty} />
      ) : (
        <EventTicker
          rows={rows}
          label={STUDIO_COPY.timeline.title}
          voidedLabel={STUDIO_COPY.timeline.voided}
        />
      )}
    </Panel>
  );
}

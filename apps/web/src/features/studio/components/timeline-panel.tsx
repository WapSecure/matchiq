'use client';

import { EmptyState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { EventTicker } from '@/components/match/event-ticker';
import { Panel } from '@/components/ui';
import { PERIOD_LABELS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { useTickerRows } from '../hooks/use-ticker-rows';
import type { Roster } from '../lib/roster';
import { useMatchStore } from '../store';

const periodLabel = (period: number): string =>
  PERIOD_LABELS[period] ?? STUDIO_COPY.timeline.period(period);

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
        <span className="tabular rounded-[5px] border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-micro text-ink-muted">
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
          periodLabel={periodLabel}
        />
      )}
    </Panel>
  );
}

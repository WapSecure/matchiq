'use client';

import { useState } from 'react';
import { LoadMore } from '@/components/ui/pagination';
import { PAGINATION_NOUNS } from '@/constants/pagination';
import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/ui';
import {
  FACT_CHECKS_COPY,
  MOMENTS_PAGE_SIZE,
  type MomentFilter,
} from '@/constants/fact-checks';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { cumulativeMs } from '@/lib/format';
import { faultOf } from './fault-chain';
import type { StripMarker } from './minute-strip';
import { MomentFilterBar } from './moment-filter-bar';
import { filterCounts, filterTraces } from './moment-filters';
import { useMomentWindow } from './use-moment-window';
import { momentAnchor, TraceCard, traceMinute } from './trace-card';
import type { RecapMomentInfo } from './use-recap-moments';

const copy = FACT_CHECKS_COPY;

const TONE = { AGENT: 'ai', TEMPLATE: 'standard', PENDING: 'pending' } as const;

const markerOf = (trace: InsightTrace, period: number | null): StripMarker => ({
  id: trace.insightId,
  atMs: cumulativeMs(period, trace.matchClockMs),
  href: `#${momentAnchor(trace.insightId)}`,
  label: copy.timeline.marker(
    INSIGHT_KIND_LABELS[trace.kind],
    traceMinute(trace, period),
    copy.facts.badge[trace.publication],
  ),
  tone: TONE[trace.publication],
  flagged: faultOf(trace.runs) !== null,
});

/** Filterable moments with a minute strip; AI-written and standard look distinct. */
export function MomentList({
  traces,
  moments,
}: {
  traces: readonly InsightTrace[];
  moments: Map<string, RecapMomentInfo>;
}) {
  const [filter, setFilter] = useState<MomentFilter>('ALL');
  const shown = filterTraces(traces, filter);
  const win = useMomentWindow(shown, filter);
  const period = (t: InsightTrace) => moments.get(t.insightId)?.period ?? null;
  return (
    <div onClickCapture={win.onJump} className="contents">
      <MomentFilterBar
        value={filter}
        onChange={setFilter}
        counts={filterCounts(traces)}
        markers={shown.map((t) => markerOf(t, period(t)))}
      />
      {shown.length === 0 ? (
        <EmptyState
          compact
          title={copy.filters.empty}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFilter('ALL')}
            >
              {copy.filters.showAll}
            </Button>
          }
        />
      ) : (
        <ol
          aria-label={OBSERVATORY_COPY.listLabel}
          className="flex flex-col gap-3"
        >
          {win.visible.map((trace) => (
            <li key={trace.insightId}>
              <TraceCard
                trace={trace}
                period={period(trace)}
                variants={moments.get(trace.insightId)?.variants ?? null}
              />
            </li>
          ))}
        </ol>
      )}
      {shown.length > MOMENTS_PAGE_SIZE ? (
        <LoadMore
          shown={win.visible.length}
          total={shown.length}
          hasMore={win.hasMore}
          onLoadMore={win.loadMore}
          noun={PAGINATION_NOUNS.moments}
          label={copy.moreLabel}
        />
      ) : null}
    </div>
  );
}

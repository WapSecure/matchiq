'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { EVENT_DETAIL } from '@/constants/events';
import {
  PITCH_COPY,
  PITCH_KINDS,
  type PitchKind,
  type PitchTeamFilter,
} from '@/constants/pitch';
import { countByKind, filterMarks, type PitchMark } from './pitch-events';
import { PitchFilters } from './pitch-filters';
import { PitchPlot } from './pitch-plot';
import { PitchTable } from './pitch-table';

type EventsViewProps = {
  marks: readonly PitchMark[];
  team: PitchTeamFilter;
  onTeam: (team: PitchTeamFilter) => void;
  length: number;
  width: number;
  homeShort: string;
  awayShort: string;
  /** Rendered above the filters so the plot keeps its height beside them. */
  viewControl: ReactNode;
};

const readout = (m: PitchMark): string =>
  [
    m.minute,
    m.teamShort,
    PITCH_COPY.kind[m.kind],
    m.outcome && m.kind === 'SHOT' ? EVENT_DETAIL.shotOutcome[m.outcome] : null,
    m.player,
  ]
    .filter(Boolean)
    .join(' · ');

function AttackDirections({ home, away }: { home: string; away: string }) {
  return (
    <div
      aria-hidden
      className="flex justify-between font-mono text-micro text-ink-subtle"
    >
      <span>{PITCH_COPY.attacks(home)} →</span>
      <span>← {PITCH_COPY.attacks(away)}</span>
    </div>
  );
}

/** Filterable event map with a hover readout and a table alternative. */
export function PitchEventsView({
  marks,
  team,
  onTeam,
  length,
  width,
  homeShort,
  awayShort,
  viewControl,
}: EventsViewProps) {
  const [kinds, setKinds] = useState<ReadonlySet<PitchKind>>(
    () => new Set(PITCH_KINDS),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const shown = useMemo(
    () => filterMarks(marks, { team, kinds }),
    [marks, team, kinds],
  );
  const scoped = useMemo(
    () => filterMarks(marks, { team, kinds: new Set(PITCH_KINDS) }),
    [marks, team],
  );
  const first = shown[0];
  const last = shown[shown.length - 1];
  const span =
    first && last ? PITCH_COPY.window(first.minute, last.minute) : null;
  const active = shown.find((m) => m.id === activeId) ?? null;
  const toggle = (kind: PitchKind) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });
  return (
    <div className="@container flex flex-col gap-3">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_12.5rem]">
        <div className="flex flex-col gap-3 @3xl:order-2 @3xl:gap-5">
          {viewControl}
          <PitchFilters
            team={team}
            onTeam={onTeam}
            kinds={kinds}
            onToggleKind={toggle}
            counts={countByKind(scoped)}
            homeShort={homeShort}
            awayShort={awayShort}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <AttackDirections home={homeShort} away={awayShort} />
          <PitchPlot
            marks={shown}
            length={length}
            width={width}
            title={PITCH_COPY.svgTitle}
            description={PITCH_COPY.summary(shown.length, span)}
            activeId={active?.id ?? null}
            onActivate={setActiveId}
            className="ring-1 ring-line"
          />
          <p className="tabular min-h-4 truncate text-xs text-ink-muted">
            {active ? readout(active) : PITCH_COPY.hint}
          </p>
        </div>
      </div>
      <PitchTable marks={shown} />
    </div>
  );
}

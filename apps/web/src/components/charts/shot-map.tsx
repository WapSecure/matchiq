import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback';
import { PITCH_COORD_MAX, type PitchTeamFilter } from '@/constants/pitch';
import { DEPTH_COPY } from '@/constants/pitch-depth';
import { DepthCanvas } from './depth-canvas';
import { DepthTable } from './depth-table';
import { MarkStepper } from './mark-stepper';
import { ShotLegend, ShotMarker } from './shot-marker';
import type { PitchMark } from './pitch-events';
import {
  selectShots,
  shotOutcomeLabel,
  shotReadout,
  shotSpeedLabel,
  shotXgLabel,
} from './pitch-shots';

type ShotMapProps = {
  marks: readonly PitchMark[];
  team: PitchTeamFilter;
  length: number;
  width: number;
  /** xG baseline is an Analyst-only figure (ADR-0040). */
  analyst: boolean;
};

/** Shots plotted by location; size carries the outcome, never colour alone. */
export function ShotMap({ marks, team, length, width, analyst }: ShotMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const shots = useMemo(() => selectShots(marks, team), [marks, team]);
  const pitch = { lengthM: length, widthM: width };
  const sx = length / PITCH_COORD_MAX;
  const sy = width / PITCH_COORD_MAX;
  const active = shots.find((m) => m.id === activeId) ?? null;
  const c = DEPTH_COPY.shots;
  const columns = [
    c.columns.minute,
    c.columns.team,
    c.columns.player,
    c.columns.outcome,
    c.columns.speed,
    ...(analyst ? [DEPTH_COPY.xgLabel] : []),
  ];
  if (shots.length === 0) {
    return <EmptyState compact title={c.empty} description={c.emptyHint} />;
  }
  return (
    <div className="flex flex-col gap-2">
      <DepthCanvas
        length={length}
        width={width}
        title={c.title}
        description={c.summary(shots.length)}
        onLeave={() => setActiveId(null)}
      >
        {shots.map((m) => (
          <ShotMarker
            key={m.id}
            mark={m}
            sx={sx}
            sy={sy}
            activeId={activeId}
            onActivate={setActiveId}
          />
        ))}
      </DepthCanvas>
      <ShotLegend />
      <MarkStepper
        ids={shots.map((m) => m.id)}
        activeId={active?.id ?? null}
        onActivate={setActiveId}
        readout={active ? shotReadout(active, pitch, analyst) : c.hint}
      />
      <DepthTable
        caption={c.title}
        columns={columns}
        rows={shots.map((m) => ({
          id: m.id,
          cells: [
            m.minute,
            m.teamShort,
            m.player ?? DEPTH_COPY.none,
            shotOutcomeLabel(m),
            shotSpeedLabel(m) ?? DEPTH_COPY.none,
            ...(analyst ? [shotXgLabel(m, pitch)] : []),
          ],
        }))}
        note={c.speedNote}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PITCH_COPY, type PitchTeamFilter } from '@/constants/pitch';
import type { PitchView } from '@/constants/pitch-depth';
import { PassMap } from './pass-map';
import type { PitchMark } from './pitch-events';
import { PitchEventsView } from './pitch-events-view';
import type { PassArrow } from './pitch-passes';
import { ShotMap } from './shot-map';

type PitchMapProps = {
  marks: readonly PitchMark[];
  /** Completed passes; the pass view draws only the top few per team. */
  passes?: readonly PassArrow[];
  length: number;
  width: number;
  homeShort: string;
  awayShort: string;
  /** Analyst audience: shows the xG baseline (synthetic, not calibrated). */
  analyst?: boolean;
  view?: PitchView;
};

/** Events, shots or passes on one pitch (the view switch lives in the panel header), each with a table alternative. */
export function PitchMap({
  marks,
  passes = [],
  length,
  width,
  homeShort,
  awayShort,
  analyst = false,
  view = 'events',
}: PitchMapProps) {
  const [team, setTeam] = useState<PitchTeamFilter>('all');
  return (
    <div className="@container flex flex-col gap-3">
      {view === 'events' ? (
        <PitchEventsView
          marks={marks}
          team={team}
          onTeam={setTeam}
          length={length}
          width={width}
          homeShort={homeShort}
          awayShort={awayShort}
        />
      ) : (
        <>
          <SegmentedControl<PitchTeamFilter>
            legend={PITCH_COPY.teamLegend}
            options={[
              { value: 'all', label: PITCH_COPY.allTeams },
              { value: 'home', label: homeShort },
              { value: 'away', label: awayShort },
            ]}
            value={team}
            onChange={setTeam}
          />
          {view === 'shots' ? (
            <ShotMap
              marks={marks}
              team={team}
              length={length}
              width={width}
              analyst={analyst}
            />
          ) : (
            <PassMap
              arrows={passes}
              team={team}
              length={length}
              width={width}
            />
          )}
        </>
      )}
    </div>
  );
}

'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo, useState } from 'react';
import { buildPitchMarks } from '@/components/charts/pitch-events';
import { buildPassArrows } from '@/components/charts/pitch-passes';
import { PitchMap } from '@/components/charts/pitch-map';
import { PitchViewSwitch } from '@/components/charts/pitch-view-switch';
import { EmptyState } from '@/components/feedback';
import { PitchIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { PITCH_COPY } from '@/constants/pitch';
import type { PitchView } from '@/constants/pitch-depth';
import { useFocusedPlayer } from '@/features/player-focus/use-focused-player';
import type { Roster } from '../lib/roster';
import { useMatchStore, useStudioUi } from '../store';

type PitchPanelProps = {
  fixture: Fixture;
  roster: Roster;
  className?: string;
};

/** Plots the session's own events from the match store (spec §31.2). */
export function PitchPanel({ fixture, roster, className }: PitchPanelProps) {
  const timeline = useMatchStore((s) => s.timeline);
  const voided = useMatchStore((s) => s.voided);
  const { playerId } = useFocusedPlayer(fixture);
  const marks = useMemo(
    () => buildPitchMarks(timeline, roster, voided, playerId),
    [timeline, roster, voided, playerId],
  );
  const [view, setView] = useState<PitchView>('events');
  const { pitch } = fixture;
  const analyst = useStudioUi((s) => s.persona) === 'ANALYST';
  const passes = useMemo(
    () => buildPassArrows(timeline, roster, pitch, voided),
    [timeline, roster, pitch, voided],
  );
  const first = marks[0];
  const last = marks[marks.length - 1];
  return (
    <Panel
      id="pitch"
      title={PITCH_COPY.title}
      description={
        first && last
          ? PITCH_COPY.windowNote(first.minute, last.minute)
          : PITCH_COPY.description
      }
      Icon={PitchIcon}
      actions={
        marks.length + passes.length > 0 ? (
          <PitchViewSwitch value={view} onChange={setView} />
        ) : null
      }
      className={className}
    >
      {marks.length === 0 && passes.length === 0 ? (
        <EmptyState compact Icon={PitchIcon} title={PITCH_COPY.empty} />
      ) : (
        <PitchMap
          marks={marks}
          passes={passes}
          view={view}
          analyst={analyst}
          length={pitch.lengthM}
          width={pitch.widthM}
          homeShort={fixture.home.shortName}
          awayShort={fixture.away.shortName}
        />
      )}
    </Panel>
  );
}

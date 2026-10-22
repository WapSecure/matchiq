'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { buildPitchMarks } from '@/components/charts/pitch-events';
import { PitchMap } from '@/components/charts/pitch-map';
import { EmptyState } from '@/components/feedback';
import { PitchIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { PITCH_COPY } from '@/constants/pitch';
import type { Roster } from '../lib/roster';
import { useMatchStore } from '../store';

type PitchPanelProps = {
  fixture: Fixture;
  roster: Roster;
  className?: string;
};

/** Plots the session's own events from the match store (spec §31.2). */
export function PitchPanel({ fixture, roster, className }: PitchPanelProps) {
  const timeline = useMatchStore((s) => s.timeline);
  const voided = useMatchStore((s) => s.voided);
  const marks = useMemo(
    () => buildPitchMarks(timeline, roster, voided),
    [timeline, roster, voided],
  );
  const { pitch } = fixture;
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
      className={className}
    >
      {marks.length === 0 ? (
        <EmptyState compact Icon={PitchIcon} title={PITCH_COPY.empty} />
      ) : (
        <PitchMap
          marks={marks}
          length={pitch.lengthM}
          width={pitch.widthM}
          homeShort={fixture.home.shortName}
          awayShort={fixture.away.shortName}
        />
      )}
    </Panel>
  );
}

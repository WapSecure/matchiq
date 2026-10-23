'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { Combobox, type ChoiceSection } from '@/components/ui';
import {
  PLAYER_FOCUS_COPY as C,
  POSITION_LABELS,
} from '@/constants/player-focus';

const sectionsOf = (fixture: Fixture): ChoiceSection[] =>
  (['home', 'away'] as const).map((side) => ({
    title: fixture[side].name,
    options: [...fixture[side].players]
      .sort((a, b) => a.shirtNumber - b.shirtNumber)
      .map((p) => ({
        id: p.playerId,
        label: p.displayName,
        description: `${C.shirt(p.shirtNumber)} · ${POSITION_LABELS[p.position]}`,
      })),
  }));

/** Both squads, searchable by name; choosing a player follows them. */
export function PlayerPicker({
  fixture,
  value,
  onChange,
}: {
  fixture: Fixture;
  value: string | null;
  onChange: (playerId: string) => void;
}) {
  const sections = useMemo(() => sectionsOf(fixture), [fixture]);
  return (
    <Combobox
      label={C.pickerLabel}
      placeholder={C.pickerPlaceholder}
      sections={sections}
      value={value}
      onChange={(id) => {
        if (id !== null) onChange(id);
      }}
      className="w-full"
    />
  );
}

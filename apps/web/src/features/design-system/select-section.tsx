'use client';

import { useState } from 'react';
import { ClockIcon, UserIcon } from '@/components/icons';
import { Combobox, Select } from '@/components/ui';
import { GALLERY_COPY as C, GALLERY_OPTIONS } from '@/constants/design-system';
import { GallerySection, Specimen } from './gallery-section';

const SPEEDS = GALLERY_OPTIONS.speeds.map((o) => ({
  ...o,
  icon: <ClockIcon size={15} />,
}));

const ROLES = GALLERY_OPTIONS.roles.map((section) => ({
  title: section.title,
  options: section.options.map((o) => ({ ...o, icon: <UserIcon size={15} /> })),
}));

function ComboboxSpecimen() {
  const [team, setTeam] = useState<string | null>(null);
  return (
    <Specimen state={C.states.searchable}>
      <Combobox
        label={C.labels.team}
        value={team}
        onChange={setTeam}
        options={GALLERY_OPTIONS.teams}
      />
      <Combobox
        label={C.labels.team}
        value={null}
        onChange={setTeam}
        options={GALLERY_OPTIONS.teams}
        errorMessage={C.invalidMessage}
      />
      <Combobox
        label={C.labels.team}
        value={null}
        onChange={setTeam}
        options={GALLERY_OPTIONS.teams}
        isLoading
        isDisabled
      />
    </Specimen>
  );
}

export function SelectSection() {
  const [speed, setSpeed] = useState<string | null>('5');
  const [role, setRole] = useState<string | null>(null);
  return (
    <GallerySection title={C.sections.select}>
      <Specimen state={C.states.described}>
        <Select
          label={C.labels.speed}
          value={speed}
          onChange={setSpeed}
          options={SPEEDS}
          popoverWidth="wide"
        />
        <Select
          label={C.labels.speed}
          value={speed}
          onChange={setSpeed}
          options={SPEEDS}
          size="md"
          description={C.states.medium}
        />
      </Specimen>
      <Specimen state={C.states.grouped}>
        <Select
          label={C.labels.role}
          value={role}
          onChange={setRole}
          sections={ROLES}
          popoverWidth="wide"
        />
      </Specimen>
      <Specimen
        state={`${C.states.invalid} · ${C.states.disabled} · ${C.states.loading}`}
      >
        <Select
          label={C.labels.role}
          value={null}
          onChange={setRole}
          sections={ROLES}
          errorMessage={C.invalidMessage}
        />
        <Select
          label={C.labels.role}
          value="producer"
          onChange={setRole}
          sections={ROLES}
          isDisabled
        />
        <Select
          label={C.labels.role}
          value={null}
          onChange={setRole}
          sections={ROLES}
          isLoading
        />
      </Specimen>
      <ComboboxSpecimen />
    </GallerySection>
  );
}

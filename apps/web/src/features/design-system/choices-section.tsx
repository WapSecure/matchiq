'use client';

import { useState } from 'react';
import {
  Checkbox,
  RadioCards,
  SegmentedControl,
  Switch,
} from '@/components/ui';
import { GALLERY_COPY as C, GALLERY_OPTIONS } from '@/constants/design-system';
import { GallerySection, Specimen } from './gallery-section';

type Persona = (typeof GALLERY_OPTIONS.persona)[number]['value'];

function CheckboxSpecimens() {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <Specimen
        state={`${C.states.default} · ${C.states.indeterminate} · ${C.states.invalid}`}
      >
        <Checkbox isSelected={checked} onChange={setChecked}>
          {C.checkboxLabel}
        </Checkbox>
        <Checkbox isSelected={false} isIndeterminate onChange={() => undefined}>
          {C.checkboxLabel}
        </Checkbox>
        <Checkbox
          isSelected={false}
          onChange={() => undefined}
          errorMessage={C.checkboxInvalid}
        >
          {C.checkboxLabel}
        </Checkbox>
        <Checkbox isSelected onChange={() => undefined} isDisabled>
          {C.checkboxLabel}
        </Checkbox>
      </Specimen>
      <Specimen state={C.states.card}>
        <Checkbox
          card
          isSelected={checked}
          onChange={setChecked}
          description={C.checkboxDescription}
        >
          {C.checkboxLabel}
        </Checkbox>
      </Specimen>
    </>
  );
}

export function ChoicesSection() {
  const [persona, setPersona] = useState<Persona>('casual');
  const [on, setOn] = useState(true);
  const [speed, setSpeed] = useState<string | null>('5');
  return (
    <GallerySection title={C.sections.choices}>
      <Specimen
        state={`${C.states.default} · ${C.states.medium} · ${C.states.disabled}`}
      >
        <SegmentedControl<Persona>
          legend={C.labels.persona}
          options={GALLERY_OPTIONS.persona}
          value={persona}
          onChange={setPersona}
        />
        <SegmentedControl<Persona>
          legend={C.labels.persona}
          options={GALLERY_OPTIONS.persona}
          value={persona}
          onChange={setPersona}
          size="md"
        />
        <SegmentedControl<Persona>
          legend={C.labels.persona}
          options={GALLERY_OPTIONS.persona}
          value={persona}
          onChange={setPersona}
          disabled
        />
      </Specimen>
      <Specimen state={`${C.states.default} · ${C.states.disabled}`}>
        <Switch
          isSelected={on}
          onChange={setOn}
          description={C.switchDescription}
        >
          {C.switchLabel}
        </Switch>
        <Switch isSelected={on} onChange={setOn} size="md">
          {C.switchLabel}
        </Switch>
        <Switch isSelected={false} onChange={() => undefined} isDisabled>
          {C.switchLabel}
        </Switch>
      </Specimen>
      <CheckboxSpecimens />
      <Specimen state={C.states.card} wide>
        <RadioCards
          label={C.labels.speed}
          options={GALLERY_OPTIONS.speeds}
          value={speed}
          onChange={setSpeed}
          columns={3}
        />
      </Specimen>
    </GallerySection>
  );
}

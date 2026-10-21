'use client';

import type { Locale, Persona } from '@matchiq/contracts';
import { SegmentedControl } from '@/components/ui';
import { LOCALE_OPTIONS, PERSONA_OPTIONS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { useStudioUi } from '../store';

/** Presentation-only: switching never touches match state or numbers. */
export function PersonaToggle() {
  const persona = useStudioUi((s) => s.persona);
  const setPersona = useStudioUi((s) => s.setPersona);
  return (
    <SegmentedControl<Persona>
      legend={STUDIO_COPY.controls.persona}
      options={PERSONA_OPTIONS}
      value={persona}
      onChange={setPersona}
    />
  );
}

export function LocaleSwitcher() {
  const locale = useStudioUi((s) => s.locale);
  const setLocale = useStudioUi((s) => s.setLocale);
  return (
    <SegmentedControl<Locale>
      legend={STUDIO_COPY.controls.locale}
      options={LOCALE_OPTIONS}
      value={locale}
      onChange={setLocale}
    />
  );
}

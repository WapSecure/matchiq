'use client';

import type { Locale, Persona } from '@matchiq/contracts';
import { DeterministicIcon } from '@/components/icons';
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

/** Persona and language for narratives; facts and figures stay identical. */
export function AudienceBar() {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-panel">
      <PersonaToggle />
      <LocaleSwitcher />
      <p className="flex max-w-md items-start gap-2 text-xs leading-relaxed text-ink-subtle lg:ml-auto">
        <DeterministicIcon size={16} className="mt-px shrink-0 text-accent" />
        {STUDIO_COPY.controls.invariant}
      </p>
    </div>
  );
}

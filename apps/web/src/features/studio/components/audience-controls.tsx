'use client';

import type { Locale, Persona } from '@matchiq/contracts';
import { DeterministicIcon } from '@/components/icons';
import { SegmentedControl } from '@/components/ui';
import { LOCALE_OPTIONS, PERSONA_OPTIONS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
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
export function AudienceBar({
  variant = 'card',
  className,
}: {
  /** `toolbar` sits flush at the top of the key-moment feed. */
  variant?: 'card' | 'toolbar';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-4 gap-y-2 px-4 py-2.5',
        variant === 'toolbar'
          ? 'border-b border-line bg-surface/95 backdrop-blur-sm'
          : 'rounded-lg border border-line bg-surface shadow-panel',
        className,
      )}
    >
      <PersonaToggle />
      <LocaleSwitcher />
      <p className="flex w-full items-center gap-1.5 text-micro text-ink-subtle">
        <DeterministicIcon size={13} className="shrink-0 text-accent" />
        {STUDIO_COPY.controls.invariant}
      </p>
    </div>
  );
}

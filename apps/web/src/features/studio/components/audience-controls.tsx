'use client';

import type { Locale, Persona } from '@matchiq/contracts';
import { DeterministicIcon } from '@/components/icons';
import { SegmentedControl } from '@/components/ui';
import { LOCALE_OPTIONS, PERSONA_OPTIONS } from '@/constants/match';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import { cn } from '@/lib/cn';
import { useStudioUi } from '../store';

/** Presentation-only: switching never touches match state or numbers. */
export function PersonaToggle() {
  const messages = useInterfaceMessages();
  const persona = useStudioUi((s) => s.persona);
  const setPersona = useStudioUi((s) => s.setPersona);
  return (
    <SegmentedControl<Persona>
      legend={messages.audience.persona}
      options={PERSONA_OPTIONS.map((option) => ({
        ...option,
        label: messages.audience.personas[option.value],
      }))}
      value={persona}
      onChange={setPersona}
    />
  );
}

export function LocaleSwitcher() {
  const messages = useInterfaceMessages();
  const locale = useStudioUi((s) => s.locale);
  const setLocale = useStudioUi((s) => s.setLocale);
  return (
    <SegmentedControl<Locale>
      legend={messages.audience.commentaryLanguage}
      options={LOCALE_OPTIONS}
      value={locale}
      onChange={setLocale}
    />
  );
}

/** Persona and commentary language; interface labels and facts stay unchanged. */
export function AudienceBar({
  variant = 'card',
  className,
}: {
  /** `toolbar` sits flush at the top of the key-moment feed. */
  variant?: 'card' | 'toolbar';
  className?: string;
}) {
  const messages = useInterfaceMessages();
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-4 gap-y-2 px-4 py-2.5',
        // Scroll margin keeps a focused option clear of the sticky page header.
        variant === 'toolbar'
          ? 'border-b border-line bg-surface/95 backdrop-blur-sm [&_input]:scroll-mt-56'
          : 'rounded-lg border border-line bg-surface shadow-panel',
        className,
      )}
    >
      <PersonaToggle />
      <LocaleSwitcher />
      <p className="flex w-full items-center gap-1.5 text-micro text-ink-subtle">
        <DeterministicIcon size={13} className="shrink-0 text-accent" />
        {messages.audience.invariant}
      </p>
    </div>
  );
}

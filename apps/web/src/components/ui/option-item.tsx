'use client';

import type { ReactNode } from 'react';
import { Header, ListBoxItem, ListBoxSection } from 'react-aria-components';
import { CheckIcon, LockIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { LIST_ITEM, SECTION_DIVIDER, SECTION_HEADER } from './control-styles';

export type ChoiceOption<K extends string = string> = {
  id: K;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Disables the option and tells the user why, in the option itself. */
  disabledReason?: string;
};

export type ChoiceSection<K extends string = string> = {
  title: string;
  options: readonly ChoiceOption<K>[];
};

export type ChoiceSource<K extends string> =
  | { options: readonly ChoiceOption<K>[]; sections?: never }
  | { sections: readonly ChoiceSection<K>[]; options?: never };

export const flattenChoices = <K extends string>(
  source: ChoiceSource<K>,
): ChoiceOption<K>[] =>
  source.sections
    ? source.sections.flatMap((s) => [...s.options])
    : [...source.options];

function OptionItem<K extends string>({
  option,
  card,
}: {
  option: ChoiceOption<K>;
  card: boolean;
}) {
  return (
    <ListBoxItem
      id={option.id}
      textValue={option.label}
      isDisabled={Boolean(option.disabledReason)}
      className={cn(LIST_ITEM, card && 'py-2.5')}
    >
      {({ isSelected, isDisabled }) => (
        <>
          {option.icon ? (
            <span className="mt-0.5 flex shrink-0 text-ink-muted group-data-selected/item:text-accent">
              {option.icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                'font-medium',
                isSelected && 'font-semibold',
                isDisabled && 'text-ink-muted',
              )}
            >
              {option.label}
            </span>
            {option.description ? (
              <span className="text-xs leading-snug text-ink-muted">
                <span className="sr-only">, </span>
                {option.description}
              </span>
            ) : null}
            {option.disabledReason ? (
              <span className="flex items-center gap-1 text-xs text-ink-subtle">
                <span className="sr-only">, </span>
                <LockIcon size={12} className="shrink-0" />
                {option.disabledReason}
              </span>
            ) : null}
          </span>
          <CheckIcon
            size={16}
            className={cn(
              'mt-0.5 shrink-0 text-accent',
              !isSelected && 'invisible',
            )}
          />
        </>
      )}
    </ListBoxItem>
  );
}

/** Options, or titled groups of options, for a ListBox. */
export function ChoiceItems<K extends string>({
  source,
}: {
  source: ChoiceSource<K>;
}) {
  const card = flattenChoices(source).some((o) => o.description);
  if (!source.sections) {
    return source.options.map((o) => (
      <OptionItem key={o.id} option={o} card={card} />
    ));
  }
  return source.sections.map((section) => (
    <ListBoxSection
      key={section.title}
      id={section.title}
      className={SECTION_DIVIDER}
    >
      <Header className={SECTION_HEADER}>{section.title}</Header>
      {section.options.map((o) => (
        <OptionItem key={o.id} option={o} card={card} />
      ))}
    </ListBoxSection>
  ));
}

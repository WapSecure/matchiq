'use client';

import {
  ComboBox as AriaComboBox,
  Button,
  Group,
  Input,
  type Key,
  ListBox,
} from 'react-aria-components';
import { ChevronDownIcon, SearchIcon, SpinnerIcon } from '@/components/icons';
import { UI_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import {
  CONTROL_HEIGHT,
  CONTROL_INVALID,
  CONTROL_PADDING,
  CONTROL_SURFACE,
  TEXT_INPUT,
} from './control-styles';
import { FIELD_ROOT, FieldFrame, type FieldProps } from './field';
import { ChoiceItems, type ChoiceSource, flattenChoices } from './option-item';
import { Popover } from './popover';

export type ComboboxProps<K extends string> = FieldProps &
  ChoiceSource<K> & {
    value: K | null;
    onChange: (value: K | null) => void;
    placeholder?: string;
    isLoading?: boolean;
  };

/** Searchable single choice; filtering is locale-aware and starts on the first keystroke. */
export function Combobox<K extends string>(props: ComboboxProps<K>) {
  const {
    label,
    hideLabel,
    description,
    errorMessage,
    isDisabled,
    isLoading = false,
    size = 'sm',
    className,
    value,
    onChange,
    placeholder = UI_COPY.comboboxPlaceholder,
  } = props;
  const source = (
    props.sections ? { sections: props.sections } : { options: props.options }
  ) as ChoiceSource<K>;
  const all = flattenChoices(source);
  return (
    <AriaComboBox
      value={value}
      onChange={(key: Key | null) =>
        onChange(all.find((o) => o.id === key)?.id ?? null)
      }
      isDisabled={isDisabled}
      isInvalid={Boolean(errorMessage)}
      aria-label={hideLabel ? label : undefined}
      menuTrigger="focus"
      allowsEmptyCollection
      className={cn(FIELD_ROOT, className)}
    >
      <FieldFrame
        label={label}
        hideLabel={hideLabel}
        description={description}
        errorMessage={errorMessage}
      >
        <Group
          className={cn(
            'flex w-full items-center gap-2',
            CONTROL_SURFACE,
            CONTROL_HEIGHT[size],
            CONTROL_PADDING[size],
            'bg-surface-sunken pr-0.5',
            'data-hovered:border-control data-focus-within:border-accent data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent',
            'data-disabled:cursor-not-allowed data-disabled:opacity-50',
            CONTROL_INVALID,
          )}
        >
          <SearchIcon size={14} className="shrink-0 text-ink-subtle" />
          <Input placeholder={placeholder} className={TEXT_INPUT} />
          {isLoading ? (
            <SpinnerIcon size={14} className="mr-2 shrink-0 text-ink-subtle" />
          ) : null}
          <Button
            aria-label={UI_COPY.showOptions}
            className="flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-subtle outline-none pointer-coarse:size-10 data-hovered:bg-surface-raised data-hovered:text-ink data-focus-visible:outline-2 data-focus-visible:outline-accent"
          >
            <ChevronDownIcon size={14} />
          </Button>
        </Group>
      </FieldFrame>
      <Popover className="min-w-(--trigger-width) p-1">
        <ListBox
          className="outline-none"
          renderEmptyState={() => (
            <p className="px-2.5 py-3 text-center text-xs text-ink-subtle">
              {isLoading ? UI_COPY.loading : UI_COPY.noResults}
            </p>
          )}
        >
          <ChoiceItems source={source} />
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}

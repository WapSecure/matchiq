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
  CONTROL_FOCUSED,
  CONTROL_HEIGHT,
  CONTROL_INVALID,
  CONTROL_PADDING,
  CONTROL_SURFACE,
  INLINE_ACTION,
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

function ListEmpty({ loading }: { loading: boolean }) {
  const Icon = loading ? SpinnerIcon : SearchIcon;
  return (
    <p className="flex flex-col items-center gap-2 px-3 py-5 text-center text-xs text-ink-subtle">
      <span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface-raised">
        <Icon size={14} />
      </span>
      {loading ? UI_COPY.loading : UI_COPY.noResults}
    </p>
  );
}

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
            'pe-1',
            'data-hovered:border-control',
            CONTROL_FOCUSED,
            'data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:bg-surface-raised data-disabled:shadow-none',
            CONTROL_INVALID,
          )}
        >
          <SearchIcon
            size={14}
            className="shrink-0 text-ink-subtle transition-colors group-data-focus-within:text-accent"
          />
          <Input placeholder={placeholder} className={TEXT_INPUT} />
          {isLoading ? (
            <SpinnerIcon size={14} className="shrink-0 text-ink-subtle" />
          ) : null}
          <Button aria-label={UI_COPY.showOptions} className={INLINE_ACTION}>
            <ChevronDownIcon
              size={14}
              className="transition-transform duration-150 group-data-open:rotate-180"
            />
          </Button>
        </Group>
      </FieldFrame>
      <Popover className="min-w-(--trigger-width) p-1.5">
        <ListBox
          className="outline-none"
          renderEmptyState={() => <ListEmpty loading={isLoading} />}
        >
          <ChoiceItems source={source} />
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}

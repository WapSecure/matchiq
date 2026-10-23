'use client';

import type { ReactNode } from 'react';
import {
  Select as AriaSelect,
  Button,
  type Key,
  ListBox,
  SelectValue,
} from 'react-aria-components';
import { ChevronDownIcon, SpinnerIcon } from '@/components/icons';
import { UI_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import {
  CONTROL_HEIGHT,
  CONTROL_INTERACTIVE,
  CONTROL_INVALID,
  CONTROL_PADDING,
  CONTROL_SURFACE,
  FOCUS_RING,
} from './control-styles';
import { FIELD_ROOT, FieldFrame, type FieldProps } from './field';
import {
  ChoiceItems,
  type ChoiceOption,
  type ChoiceSource,
  flattenChoices,
} from './option-item';
import { Popover } from './popover';

export type SelectProps<K extends string> = FieldProps &
  ChoiceSource<K> & {
    value: K | null;
    onChange: (value: K) => void;
    placeholder?: string;
    isLoading?: boolean;
    /** Wider popover for descriptive option cards. */
    popoverWidth?: 'trigger' | 'wide';
  };

function SelectedValue<K extends string>({
  option,
  placeholder,
}: {
  option: ChoiceOption<K> | undefined;
  placeholder: string;
}): ReactNode {
  if (!option) return <span className="text-ink-subtle">{placeholder}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.icon ? (
        <span className="flex shrink-0 text-ink-muted">{option.icon}</span>
      ) : null}
      <span className="truncate">{option.label}</span>
    </span>
  );
}

/** Single choice from a list; options can carry descriptions, icons and disabled reasons. */
export function Select<K extends string>(props: SelectProps<K>) {
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
    placeholder = UI_COPY.selectPlaceholder,
    popoverWidth = 'trigger',
  } = props;
  const source = (
    props.sections ? { sections: props.sections } : { options: props.options }
  ) as ChoiceSource<K>;
  const all = flattenChoices(source);
  const selected = all.find((o) => o.id === value);
  return (
    <AriaSelect
      value={value}
      onChange={(key: Key | null) => {
        const next = all.find((o) => o.id === key);
        if (next) onChange(next.id);
      }}
      isDisabled={isDisabled || isLoading}
      isInvalid={Boolean(errorMessage)}
      aria-busy={isLoading || undefined}
      placeholder={placeholder}
      className={cn(FIELD_ROOT, className)}
    >
      <FieldFrame
        label={label}
        hideLabel={hideLabel}
        description={description}
        errorMessage={errorMessage}
      >
        <Button
          className={cn(
            'flex w-full min-w-0 items-center justify-between gap-2 text-left',
            CONTROL_SURFACE,
            CONTROL_HEIGHT[size],
            CONTROL_PADDING[size],
            CONTROL_INTERACTIVE,
            CONTROL_INVALID,
            FOCUS_RING,
            'data-pressed:border-accent group-data-open:border-accent',
          )}
        >
          <SelectValue className="flex min-w-0 flex-1">
            {() => (
              <SelectedValue option={selected} placeholder={placeholder} />
            )}
          </SelectValue>
          {isLoading ? (
            <SpinnerIcon size={14} className="shrink-0 text-ink-subtle" />
          ) : (
            <ChevronDownIcon
              size={14}
              className="shrink-0 text-ink-subtle transition-transform duration-150 group-data-open:rotate-180"
            />
          )}
        </Button>
      </FieldFrame>
      <Popover
        className={cn(
          'min-w-(--trigger-width) p-1',
          popoverWidth === 'wide' && 'w-[min(26rem,calc(100vw-2rem))]',
        )}
      >
        <ListBox className="outline-none">
          <ChoiceItems source={source} />
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

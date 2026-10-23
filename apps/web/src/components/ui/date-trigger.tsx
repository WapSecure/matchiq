'use client';

import { type ReactNode, type RefObject, useId } from 'react';
import { Button, DialogTrigger } from 'react-aria-components';
import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  CONTROL_HEIGHT,
  INLINE_ACTION,
  LABEL,
  TRIGGER,
  TRIGGER_TONE,
} from './control-styles';
import { Messages, TriggerContent } from './date-trigger-parts';
import { FIELD_ROOT, type FieldProps } from './field';

export type PickerFieldProps = FieldProps & {
  /** Human summary of the value; `null` shows the placeholder. */
  summary: string | null;
  placeholder: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown as a × inside the field while there is a value. */
  onClear?: () => void;
  clearLabel: string;
  anchorRef: RefObject<HTMLDivElement | null>;
  /** The popover; it is anchored to the whole field. */
  children: ReactNode;
};

/** The closed state of every date picker: a labelled button with a readable summary. */
export function PickerField(props: PickerFieldProps) {
  const { label, description, errorMessage, isDisabled, size = 'sm' } = props;
  const ids = { label: useId(), value: useId(), help: useId(), error: useId() };
  const clearable = Boolean(props.summary && props.onClear && !isDisabled);
  const describedBy = cn(
    description ? ids.help : false,
    errorMessage ? ids.error : false,
  );
  return (
    <div className={cn(FIELD_ROOT, props.className)}>
      <span id={ids.label} className={cn(LABEL, props.hideLabel && 'sr-only')}>
        {label}
      </span>
      <div
        ref={props.anchorRef}
        role="group"
        aria-labelledby={ids.label}
        className="relative"
      >
        <DialogTrigger isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
          <Button
            isDisabled={isDisabled}
            aria-labelledby={`${ids.label} ${ids.value}`}
            aria-describedby={describedBy || undefined}
            className={cn(
              TRIGGER,
              CONTROL_HEIGHT[size],
              errorMessage ? TRIGGER_TONE.invalid : TRIGGER_TONE.default,
              clearable ? 'pe-9' : 'pe-2.5',
            )}
          >
            <TriggerContent
              size={size}
              summary={props.summary}
              placeholder={props.placeholder}
              valueId={ids.value}
              showChevron={!clearable}
            />
          </Button>
          {props.children}
        </DialogTrigger>
        {clearable ? (
          <Button
            aria-label={props.clearLabel}
            onPress={props.onClear}
            className={cn(
              INLINE_ACTION,
              'absolute end-1.5 top-1/2 -translate-y-1/2',
            )}
          >
            <CloseIcon size={13} />
          </Button>
        ) : null}
      </div>
      <Messages
        ids={ids}
        description={description}
        errorMessage={errorMessage}
      />
    </div>
  );
}

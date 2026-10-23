'use client';

import {
  Input,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
} from 'react-aria-components';
import { cn } from '@/lib/cn';
import {
  CONTROL_HEIGHT,
  CONTROL_INVALID,
  CONTROL_PADDING,
  CONTROL_SURFACE,
} from './control-styles';
import { FIELD_ROOT, FieldFrame, type FieldProps } from './field';

type TextFieldProps = FieldProps & {
  value: string;
  onChange: (value: string) => void;
  /** Kept for existing call sites; same as `description`. */
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'search' | 'email' | 'url';
  spellCheck?: boolean;
  autoComplete?: string;
  isRequired?: boolean;
  maxLength?: number;
};

const INPUT = cn(
  'w-full min-w-0 bg-surface-sunken text-ink outline-none placeholder:text-ink-subtle',
  CONTROL_SURFACE,
  'data-hovered:border-control data-focused:border-accent data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  CONTROL_INVALID,
);

export function TextField({
  label,
  hideLabel,
  description,
  hint,
  errorMessage,
  isDisabled,
  size = 'sm',
  className,
  value,
  onChange,
  placeholder,
  type = 'text',
  spellCheck,
  autoComplete,
  isRequired,
  maxLength,
}: TextFieldProps) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      type={type}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={Boolean(errorMessage)}
      maxLength={maxLength}
      autoComplete={autoComplete}
      className={cn(FIELD_ROOT, className)}
    >
      <FieldFrame
        label={label}
        hideLabel={hideLabel}
        description={description ?? hint}
        errorMessage={errorMessage}
      >
        <Input
          placeholder={placeholder}
          spellCheck={spellCheck}
          className={cn(INPUT, CONTROL_HEIGHT[size], CONTROL_PADDING[size])}
        />
      </FieldFrame>
    </AriaTextField>
  );
}

export function TextArea({
  label,
  hideLabel,
  description,
  errorMessage,
  isDisabled,
  className,
  value,
  onChange,
  placeholder,
  rows = 3,
}: FieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      isInvalid={Boolean(errorMessage)}
      className={cn(FIELD_ROOT, className)}
    >
      <FieldFrame
        label={label}
        hideLabel={hideLabel}
        description={description}
        errorMessage={errorMessage}
      >
        <AriaTextArea
          rows={rows}
          placeholder={placeholder}
          className={cn(INPUT, 'resize-y px-3 py-2 text-[13px]')}
        />
      </FieldFrame>
    </AriaTextField>
  );
}

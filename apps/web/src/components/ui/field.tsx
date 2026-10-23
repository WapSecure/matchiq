'use client';

import type { ReactNode } from 'react';
import {
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Text,
} from 'react-aria-components';
import { AlertIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { ERROR_TEXT, HELP_TEXT, LABEL } from './control-styles';

export type FieldProps = {
  label: string;
  /** Keeps the label for assistive tech only; prefer a visible label. */
  hideLabel?: boolean;
  description?: ReactNode;
  /** Shown, and the field marked invalid, whenever it is set. */
  errorMessage?: string;
  isDisabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

export function FieldLabel({
  children,
  hidden = false,
}: {
  children: ReactNode;
  hidden?: boolean;
}) {
  return (
    <AriaLabel className={cn(LABEL, hidden && 'sr-only')}>{children}</AriaLabel>
  );
}

export function FieldDescription({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <Text slot="description" className={HELP_TEXT}>
      {children}
    </Text>
  );
}

/** Renders only while the parent field is invalid. */
export function FieldError({ children }: { children?: ReactNode }) {
  return (
    <AriaFieldError className={ERROR_TEXT}>
      {(validation) => (
        <>
          <AlertIcon size={12} className="mt-0.5 shrink-0" />
          <span>{children ?? validation.validationErrors.join(' ')}</span>
        </>
      )}
    </AriaFieldError>
  );
}

/** Label, help text and error in the order every field uses. */
export function FieldFrame({
  label,
  hideLabel,
  description,
  errorMessage,
  children,
}: Pick<FieldProps, 'label' | 'hideLabel' | 'description' | 'errorMessage'> & {
  children: ReactNode;
}) {
  return (
    <>
      <FieldLabel hidden={hideLabel}>{label}</FieldLabel>
      {children}
      <FieldDescription>{description}</FieldDescription>
      <FieldError>{errorMessage}</FieldError>
    </>
  );
}

export const FIELD_ROOT = 'group flex min-w-0 flex-col gap-1.5';

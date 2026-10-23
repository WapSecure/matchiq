'use client';

import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
} from 'react-aria-components';
import { SpinnerIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles';

export type ActionButtonProps = Omit<AriaButtonProps, 'children'> & {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  iconOnly?: boolean;
};

/**
 * React Aria button with the house styles. Use it to open menus, popovers and
 * pickers, which need its press events and trigger context; `isPending`
 * shows a spinner and keeps focus.
 */
export function ActionButton({
  variant = 'secondary',
  size = 'sm',
  leadingIcon,
  iconOnly = false,
  className,
  children,
  isPending,
  ...rest
}: ActionButtonProps) {
  return (
    <AriaButton
      {...rest}
      isPending={isPending}
      className={composeRenderProps(className, (c) =>
        cn(
          BUTTON_BASE,
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          'outline-none pointer-coarse:min-h-11 data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent data-disabled:cursor-not-allowed data-disabled:opacity-50 data-pending:cursor-progress',
          iconOnly && 'aspect-square px-0 pointer-coarse:min-w-11',
          c,
        ),
      )}
    >
      {isPending ? <SpinnerIcon size={14} /> : leadingIcon}
      {children}
    </AriaButton>
  );
}

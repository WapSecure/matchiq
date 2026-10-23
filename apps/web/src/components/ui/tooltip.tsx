'use client';

import type { DOMAttributes, ReactElement, ReactNode } from 'react';
import {
  Tooltip as AriaTooltip,
  Focusable,
  OverlayArrow,
  TooltipTrigger,
} from 'react-aria-components';
import { OverlayArrowIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { OVERLAY_MOTION } from './control-styles';

const OPEN_DELAY_MS = 450;
const CLOSE_DELAY_MS = 120;
const TOOLTIP_OFFSET = 8;

// Focusable is typed for intrinsic elements; app components that spread DOM
// props and `ref` onto their root element (Button, Badge) behave the same.
type FocusableChild = ReactElement<DOMAttributes<Element>, string>;

type Placement = 'top' | 'bottom' | 'start' | 'end';

type TooltipProps = {
  content: ReactNode;
  /** A focusable element (button, link) that names the action. */
  children: ReactElement;
  placement?: Placement;
  /**
   * Set when the child is a React Aria control (Button, ToggleButton), which
   * consumes the trigger context itself; other children are made focusable.
   */
  ariaChild?: boolean;
  isDisabled?: boolean;
};

/**
 * Supplementary hint on hover and keyboard focus, never the only source of a
 * name or of essential information. Escape dismisses it (WCAG 1.4.13).
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  ariaChild = false,
  isDisabled = false,
}: TooltipProps) {
  return (
    <TooltipTrigger
      delay={OPEN_DELAY_MS}
      closeDelay={CLOSE_DELAY_MS}
      isDisabled={isDisabled}
    >
      {ariaChild ? (
        children
      ) : (
        <Focusable>{children as FocusableChild}</Focusable>
      )}
      <AriaTooltip
        placement={placement}
        offset={TOOLTIP_OFFSET}
        className={cn(
          'group max-w-64 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium leading-snug text-canvas shadow-float',
          OVERLAY_MOTION,
        )}
      >
        <OverlayArrow>
          <OverlayArrowIcon className="fill-ink group-data-[placement=bottom]:rotate-180 group-data-[placement=left]:-rotate-90 group-data-[placement=right]:rotate-90" />
        </OverlayArrow>
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}

'use client';

import type { ReactNode } from 'react';
import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
  composeRenderProps,
  Dialog,
  DialogTrigger,
  Heading,
  OverlayArrow,
} from 'react-aria-components';
import { OverlayArrowIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { OVERLAY_MOTION, OVERLAY_SURFACE } from './control-styles';

const POPOVER_OFFSET = 6;

const MAX_HEIGHT = {
  list: 'max-h-[min(24rem,var(--visual-viewport-height))]',
  panel: 'max-h-[calc(var(--visual-viewport-height)-1rem)]',
} as const;

/** Floating surface shared by Select, Combobox, Menu and date pickers. */
export function Popover({
  className,
  offset,
  fit = 'list',
  ...props
}: AriaPopoverProps & {
  /** `panel` lets tall content such as a calendar use the whole viewport. */
  fit?: keyof typeof MAX_HEIGHT;
}) {
  return (
    <AriaPopover
      offset={offset ?? POPOVER_OFFSET}
      {...props}
      className={composeRenderProps(className, (c) =>
        cn(
          OVERLAY_SURFACE,
          OVERLAY_MOTION,
          MAX_HEIGHT[fit],
          'overflow-auto',
          c,
        ),
      )}
    />
  );
}

export { DialogTrigger as PopoverTrigger };

type PopoverPanelProps = Omit<AriaPopoverProps, 'children' | 'className'> & {
  className?: string;
  title?: string;
  children: ReactNode;
  /** Required when there is no visible title. */
  'aria-label'?: string;
  arrow?: boolean;
};

/** Non-modal dialog in a popover: rich help, filters, small forms. */
export function PopoverPanel({
  title,
  children,
  arrow = false,
  'aria-label': ariaLabel,
  className,
  ...props
}: PopoverPanelProps) {
  return (
    <Popover
      {...props}
      className={cn('w-80 max-w-[calc(100vw-2rem)]', className)}
    >
      {arrow ? (
        <OverlayArrow>
          <OverlayArrowIcon className="fill-surface stroke-line-strong group-data-[placement=bottom]:rotate-180" />
        </OverlayArrow>
      ) : null}
      <Dialog aria-label={ariaLabel} className="p-4 outline-none">
        {title ? (
          <Heading
            slot="title"
            className="mb-1.5 text-[13px] font-semibold text-ink"
          >
            {title}
          </Heading>
        ) : null}
        <div className="text-[13px] leading-relaxed text-ink-muted">
          {children}
        </div>
      </Dialog>
    </Popover>
  );
}

'use client';

import type { ReactNode } from 'react';
import {
  Disclosure as AriaDisclosure,
  DisclosureGroup,
  DisclosurePanel,
  Button,
  Heading,
} from 'react-aria-components';
import { ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

type DisclosureVariant = 'inline' | 'card';

type DisclosureProps = {
  title: ReactNode;
  children: ReactNode;
  /** Trailing summary shown beside the title, such as a count. */
  meta?: ReactNode;
  defaultExpanded?: boolean;
  isDisabled?: boolean;
  variant?: DisclosureVariant;
  id?: string;
  className?: string;
  panelClassName?: string;
};

const TRIGGER: Record<DisclosureVariant, string> = {
  inline:
    'min-h-6 gap-1 rounded-sm text-xs font-medium text-ink-muted data-hovered:text-ink',
  card: 'min-h-10 w-full gap-2 px-3 text-[13px] font-semibold text-ink data-hovered:bg-surface-raised',
};

/** Show-more region with a real button and `aria-expanded`; replaces `<details>`. */
export function Disclosure({
  title,
  children,
  meta,
  defaultExpanded,
  isDisabled,
  variant = 'inline',
  id,
  className,
  panelClassName,
}: DisclosureProps) {
  const trigger = (
    <Button
      slot="trigger"
      className={cn(
        'flex cursor-pointer select-none items-center text-left outline-none pointer-coarse:min-h-11',
        'data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent',
        'data-disabled:cursor-not-allowed data-disabled:text-ink-subtle',
        TRIGGER[variant],
      )}
    >
      <ChevronRightIcon
        size={14}
        className="shrink-0 transition-transform duration-150 ease-[var(--ease-broadcast)] group-data-expanded/disclosure:rotate-90 rtl:-scale-x-100 rtl:group-data-expanded/disclosure:-rotate-90"
      />
      <span className="min-w-0 flex-1">{title}</span>
      {meta ? (
        <span className="ml-2 shrink-0 font-normal text-ink-subtle">
          {meta}
        </span>
      ) : null}
    </Button>
  );
  return (
    <AriaDisclosure
      id={id}
      defaultExpanded={defaultExpanded}
      isDisabled={isDisabled}
      className={cn(
        'group/disclosure',
        variant === 'card' &&
          'rounded-lg border border-line bg-surface shadow-panel',
        className,
      )}
    >
      {variant === 'card' ? (
        <Heading level={3} className="m-0 flex">
          {trigger}
        </Heading>
      ) : (
        trigger
      )}
      <DisclosurePanel
        className={cn(
          'h-(--disclosure-panel-height) overflow-clip transition-[height] duration-200 ease-[var(--ease-broadcast)] motion-reduce:transition-none',
          variant === 'card' &&
            'group-data-expanded/disclosure:border-t group-data-expanded/disclosure:border-line',
        )}
      >
        <div
          className={cn(variant === 'card' ? 'p-3' : 'pt-2', panelClassName)}
        >
          {children}
        </div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}

/** Stacked disclosures; one open at a time unless `allowsMultipleExpanded`. */
export function Accordion({
  children,
  allowsMultipleExpanded = false,
  defaultExpandedKeys,
  className,
}: {
  children: ReactNode;
  allowsMultipleExpanded?: boolean;
  /** Ids of the disclosures open at first. */
  defaultExpandedKeys?: readonly string[];
  className?: string;
}) {
  return (
    <DisclosureGroup
      allowsMultipleExpanded={allowsMultipleExpanded}
      defaultExpandedKeys={defaultExpandedKeys}
      className={cn('flex flex-col gap-2', className)}
    >
      {children}
    </DisclosureGroup>
  );
}

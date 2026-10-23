'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  type Key,
  Keyboard,
  MenuTrigger,
  Separator,
} from 'react-aria-components';
import { cn } from '@/lib/cn';
import { LIST_ITEM } from './control-styles';
import { Popover } from './popover';

export type MenuAction = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  tone?: 'default' | 'danger';
  isDisabled?: boolean;
  /** Draws a divider above this action. */
  separated?: boolean;
};

type MenuProps = {
  /** An `ActionButton`: menus need React Aria press events. */
  trigger: ReactElement;
  label: string;
  actions: readonly MenuAction[];
  onAction: (id: string) => void;
  placement?: 'bottom start' | 'bottom end';
};

function Item({ action }: { action: MenuAction }) {
  return (
    <AriaMenuItem
      id={action.id}
      textValue={action.label}
      isDisabled={action.isDisabled}
      className={cn(
        LIST_ITEM,
        'items-center data-disabled:opacity-50',
        action.tone === 'danger' &&
          'text-critical data-focused:bg-critical/10 data-hovered:bg-critical/10',
      )}
    >
      {action.icon ? (
        <span className="flex shrink-0 text-ink-muted">{action.icon}</span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{action.label}</span>
        {action.description ? (
          <span className="text-xs text-ink-muted">
            <span className="sr-only">, </span>
            {action.description}
          </span>
        ) : null}
      </span>
      {action.shortcut ? (
        <Keyboard className="ml-4 font-mono text-micro text-ink-subtle">
          {action.shortcut}
        </Keyboard>
      ) : null}
    </AriaMenuItem>
  );
}

/** Dropdown of commands; typeahead, arrow keys and Escape come from React Aria. */
export function Menu({
  trigger,
  label,
  actions,
  onAction,
  placement = 'bottom start',
}: MenuProps) {
  return (
    <MenuTrigger>
      {trigger}
      <Popover placement={placement} className="min-w-48 p-1">
        <AriaMenu
          aria-label={label}
          onAction={(key: Key) => onAction(String(key))}
          className="outline-none"
        >
          {actions.flatMap((action) =>
            action.separated
              ? [
                  <Separator
                    key={`${action.id}-separator`}
                    className="mx-1 my-1 h-px bg-line"
                  />,
                  <Item key={action.id} action={action} />,
                ]
              : [<Item key={action.id} action={action} />],
          )}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}

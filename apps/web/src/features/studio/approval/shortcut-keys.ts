import type { KeyboardEvent } from 'react';
import { SHORTCUT_KEYS } from '@/constants/approval-shortcuts';

export type ShortcutAction =
  'approve' | 'reject' | 'next' | 'previous' | 'help';

const BLOCKED =
  'input,textarea,select,[contenteditable],[role=radio],[role=textbox],[role=dialog],[role=switch]';

type Table = readonly (readonly [ShortcutAction, readonly string[]])[];

const ANYWHERE: Table = [
  ['approve', SHORTCUT_KEYS.approve],
  ['reject', SHORTCUT_KEYS.reject],
  ['next', SHORTCUT_KEYS.next],
  ['previous', SHORTCUT_KEYS.previous],
  ['help', SHORTCUT_KEYS.help],
];

const ON_GRAPHIC_ONLY: Table = [
  ['approve', SHORTCUT_KEYS.approveOnItem],
  ['next', SHORTCUT_KEYS.nextItem],
  ['previous', SHORTCUT_KEYS.previousItem],
];

const lookup = (table: Table, key: string) =>
  table.find(([, keys]) => keys.includes(key))?.[0] ?? null;

const usable = (event: KeyboardEvent<HTMLElement>, enabled: boolean) =>
  enabled &&
  !event.defaultPrevented &&
  !event.repeat &&
  !(event.ctrlKey || event.metaKey || event.altKey);

/**
 * Maps a key press to an action. Only keys pressed on a waiting graphic or
 * one of its buttons count, never while typing, in a dialog or with a
 * modifier held (WCAG 2.1.4).
 */
export const shortcutFor = (
  event: KeyboardEvent<HTMLElement>,
  enabled: boolean,
): ShortcutAction | null => {
  const target = event.target as HTMLElement;
  if (!usable(event, enabled) || !event.currentTarget.contains(target)) {
    return null;
  }
  if (target.closest(BLOCKED)) return null;
  const onItem = target.hasAttribute('data-review-item');
  if (!onItem && target.tagName !== 'BUTTON') return null;
  const key = event.key.toLowerCase();
  return (
    lookup(ANYWHERE, key) ?? (onItem ? lookup(ON_GRAPHIC_ONLY, key) : null)
  );
};

/** Moves focus to the neighbouring waiting graphic. */
export const focusSibling = (from: HTMLElement, step: 1 | -1) => {
  const items = Array.from(
    from.parentElement?.querySelectorAll<HTMLElement>('[data-review-item]') ??
      [],
  );
  items[items.indexOf(from) + step]?.focus();
};

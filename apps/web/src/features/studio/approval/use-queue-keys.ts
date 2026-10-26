'use client';

import { type KeyboardEvent, type RefObject, useCallback } from 'react';
import { shortcutFor } from './shortcut-keys';

/** Opens the key list on `?`, and keeps focus in the queue when a settled card goes. */
export const useQueueKeys = (
  region: RefObject<HTMLElement | null>,
  shortcuts: boolean,
  forget: (key: string) => void,
  openHelp: () => void,
) => {
  const onExpire = useCallback(
    (key: string, hadFocus: boolean) => {
      forget(key);
      if (!hadFocus) return;
      const next =
        region.current?.querySelector<HTMLElement>('[data-review-item]');
      (next ?? region.current)?.focus();
    },
    [forget, region],
  );
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (shortcutFor(event, shortcuts) !== 'help') return;
    event.preventDefault();
    openHelp();
  };
  return { onExpire, onKeyDown };
};

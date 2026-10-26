'use client';

import { useCallback, useEffect, useState } from 'react';
import { SHORTCUTS_STORAGE_KEY } from '@/constants/approval-shortcuts';

/** Shortcuts are on by default; the choice is remembered on this device. */
export const useShortcutSetting = (): [boolean, (on: boolean) => void] => {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(SHORTCUTS_STORAGE_KEY) === 'off') {
        setEnabled(false);
      }
    } catch {
      // Storage can be blocked; the default stays on.
    }
  }, []);
  const update = useCallback((on: boolean) => {
    setEnabled(on);
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // The choice still applies for this visit.
    }
  }, []);
  return [enabled, update];
};

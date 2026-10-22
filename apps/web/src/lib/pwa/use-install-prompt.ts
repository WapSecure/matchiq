'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IOS_USER_AGENT,
  MAC_USER_AGENT,
  PWA_ENABLED,
  PWA_STORAGE_KEYS,
  STANDALONE_QUERY,
} from '@/constants/pwa';

/** Chromium-only event; not in the DOM lib typings. */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallMode = 'hidden' | 'prompt' | 'ios';

export type InstallPromptState = {
  mode: InstallMode;
  install: () => Promise<void>;
  dismiss: () => void;
};

export const isIos = (nav: Navigator): boolean =>
  IOS_USER_AGENT.test(nav.userAgent) ||
  (MAC_USER_AGENT.test(nav.userAgent) && nav.maxTouchPoints > 1);

export const isStandalone = (win: Window): boolean =>
  win.matchMedia?.(STANDALONE_QUERY).matches === true ||
  (win.navigator as Navigator & { standalone?: boolean }).standalone === true;

const readDismissed = (): boolean => {
  try {
    return (
      window.localStorage.getItem(PWA_STORAGE_KEYS.installDismissed) !== null
    );
  } catch {
    return false;
  }
};

const storeDismissed = () => {
  try {
    window.localStorage.setItem(PWA_STORAGE_KEYS.installDismissed, '1');
  } catch {
    // Storage can be unavailable (private mode); dismissal then lasts the session.
  }
};

export function useInstallPrompt(enabled = PWA_ENABLED): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [mode, setMode] = useState<InstallMode>('hidden');

  useEffect(() => {
    if (!enabled || isStandalone(window) || readDismissed()) return undefined;
    if (isIos(navigator)) setMode('ios');
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => {
      setDeferred(null);
      setMode('hidden');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [enabled]);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // A prompt event can be used once; Chromium fires a new one if still eligible.
    setDeferred(null);
    setMode('hidden');
  }, [deferred]);

  const dismiss = useCallback(() => {
    storeDismissed();
    setDeferred(null);
    setMode('hidden');
  }, []);

  return { mode, install, dismiss };
}

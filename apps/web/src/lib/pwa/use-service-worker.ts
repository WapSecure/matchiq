'use client';

import { useCallback, useEffect, useState } from 'react';
import { PWA_ENABLED } from '@/constants/pwa';
import { applyUpdate, registerServiceWorker } from './service-worker';

export type ServiceWorkerState = {
  updateReady: boolean;
  reload: () => void;
};

const reloadPage = () => window.location.reload();

export function useServiceWorker(enabled = PWA_ENABLED): ServiceWorkerState {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return undefined;
    const container = navigator.serviceWorker;
    let registration: ServiceWorkerRegistration | undefined;
    let active = true;
    // An installed app can stay open for hours; re-check when it is refocused.
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') {
        registration?.update().catch(() => undefined);
      }
    };
    registerServiceWorker(container, (worker) => {
      if (active) setWaiting(worker);
    })
      .then((reg) => {
        registration = reg;
      })
      .catch(() => undefined);
    document.addEventListener('visibilitychange', checkForUpdate);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', checkForUpdate);
    };
  }, [enabled]);

  const reload = useCallback(() => {
    if (!waiting) return;
    applyUpdate(navigator.serviceWorker, waiting, reloadPage);
  }, [waiting]);

  return { updateReady: waiting !== null, reload };
}

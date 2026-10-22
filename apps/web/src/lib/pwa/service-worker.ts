import { SERVICE_WORKER, SW_MESSAGES } from '@/constants/pwa';

export type UpdateListener = (waiting: ServiceWorker) => void;

/**
 * Registers the worker and reports a waiting update. A waiting worker only
 * counts as an update when a controller exists; on first install there is
 * nothing to replace.
 */
export const registerServiceWorker = async (
  container: ServiceWorkerContainer,
  onUpdate: UpdateListener,
): Promise<ServiceWorkerRegistration> => {
  const registration = await container.register(SERVICE_WORKER.url, {
    scope: SERVICE_WORKER.scope,
    updateViaCache: 'none',
  });
  const reportWaiting = () => {
    if (registration.waiting && container.controller) {
      onUpdate(registration.waiting);
    }
  };
  reportWaiting();
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed') reportWaiting();
    });
  });
  return registration;
};

/** Activates the waiting worker, then reloads once it controls the page. */
export const applyUpdate = (
  container: ServiceWorkerContainer,
  waiting: ServiceWorker,
  reload: () => void,
): void => {
  container.addEventListener('controllerchange', () => reload(), {
    once: true,
  });
  waiting.postMessage({ type: SW_MESSAGES.skipWaiting });
};

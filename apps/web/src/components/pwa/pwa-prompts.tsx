'use client';

import { Button, ToastCard } from '@/components/ui';
import { PWA_COPY } from '@/constants/pwa';
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt';
import { useServiceWorker } from '@/lib/pwa/use-service-worker';

function InstallPrompt() {
  const { mode, install, dismiss } = useInstallPrompt();
  if (mode === 'hidden') return null;
  const copy = PWA_COPY.install;
  return (
    <ToastCard
      label={copy.region}
      onDismiss={dismiss}
      dismissLabel={copy.dismiss}
      action={
        mode === 'prompt' ? (
          <Button size="xs" variant="primary" onClick={() => void install()}>
            {copy.action}
          </Button>
        ) : undefined
      }
    >
      {mode === 'prompt' ? null : (
        <p className="text-xs text-ink-muted">{copy.iosHint}</p>
      )}
    </ToastCard>
  );
}

/** Update toast and install affordance; renders nothing until one applies. */
export function PwaPrompts() {
  const { updateReady, reload } = useServiceWorker();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div aria-live="polite" className="contents">
        {updateReady ? (
          <ToastCard
            label={PWA_COPY.update.region}
            action={
              <Button size="xs" variant="primary" onClick={reload}>
                {PWA_COPY.update.action}
              </Button>
            }
          >
            <p>{PWA_COPY.update.message}</p>
          </ToastCard>
        ) : null}
      </div>
      <InstallPrompt />
    </div>
  );
}

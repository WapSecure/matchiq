'use client';

import { Button, ToastCard } from '@/components/ui';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt';
import { useServiceWorker } from '@/lib/pwa/use-service-worker';

function InstallPrompt() {
  const messages = useInterfaceMessages();
  const { mode, install, dismiss } = useInstallPrompt();
  if (mode === 'hidden') return null;
  return (
    <ToastCard
      label={messages.pwa.installRegion}
      onDismiss={dismiss}
      dismissLabel={messages.pwa.dismissInstall}
      action={
        mode === 'prompt' ? (
          <Button size="xs" variant="primary" onClick={() => void install()}>
            {messages.pwa.installAction}
          </Button>
        ) : undefined
      }
    >
      {mode === 'prompt' ? null : (
        <p className="text-xs text-ink-muted">{messages.pwa.iosHint}</p>
      )}
    </ToastCard>
  );
}

/** Update toast and install affordance; renders nothing until one applies. */
export function PwaPrompts() {
  const messages = useInterfaceMessages();
  const { updateReady, reload } = useServiceWorker();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div aria-live="polite" className="contents">
        {updateReady ? (
          <ToastCard
            label={messages.pwa.updateRegion}
            action={
              <Button size="xs" variant="primary" onClick={reload}>
                {messages.pwa.reload}
              </Button>
            }
          >
            <p>{messages.pwa.updateMessage}</p>
          </ToastCard>
        ) : null}
      </div>
      <InstallPrompt />
    </div>
  );
}

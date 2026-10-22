'use client';

import type { ReactNode } from 'react';
import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { PWA_COPY } from '@/constants/pwa';
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt';
import { useServiceWorker } from '@/lib/pwa/use-service-worker';

function Toast({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="pointer-events-auto flex max-w-full items-center gap-3 rounded-lg border border-line-strong bg-surface-raised py-1.5 pl-3 pr-1.5 text-sm text-ink shadow-lg"
    >
      {children}
    </section>
  );
}

function InstallPrompt() {
  const { mode, install, dismiss } = useInstallPrompt();
  if (mode === 'hidden') return null;
  const copy = PWA_COPY.install;
  return (
    <Toast label={copy.region}>
      {mode === 'prompt' ? (
        <Button size="xs" variant="primary" onClick={() => void install()}>
          {copy.action}
        </Button>
      ) : (
        <p className="text-xs text-ink-muted">{copy.iosHint}</p>
      )}
      <Button
        size="xs"
        variant="ghost"
        iconOnly
        aria-label={copy.dismiss}
        onClick={dismiss}
      >
        <CloseIcon size={14} />
      </Button>
    </Toast>
  );
}

/** Update toast and install affordance; renders nothing until one applies. */
export function PwaPrompts() {
  const { updateReady, reload } = useServiceWorker();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div aria-live="polite" className="contents">
        {updateReady ? (
          <Toast label={PWA_COPY.update.region}>
            <p>{PWA_COPY.update.message}</p>
            <Button size="xs" variant="primary" onClick={reload}>
              {PWA_COPY.update.action}
            </Button>
          </Toast>
        ) : null}
      </div>
      <InstallPrompt />
    </div>
  );
}

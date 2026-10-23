'use client';

import { type ReactNode, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { UNSAFE_PortalProvider } from 'react-aria';
import { cn } from '@/lib/cn';

const noopSubscribe = () => () => undefined;

const schemeClass = (scheme: 'light' | 'dark') =>
  scheme === 'dark' ? 'scheme-dark' : 'scheme-light';

/**
 * Pins a colour scheme for its subtree. Overlays portal into a scheme-pinned
 * container at `<body>` level, so a popover opened in the dark pane is dark
 * and is positioned exactly as on product pages.
 */
export function ThemePane({
  scheme,
  title,
  children,
}: {
  scheme: 'light' | 'dark';
  title: string;
  children: ReactNode;
}) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  // Null during server render and hydration, so the portal mounts afterwards.
  const body = useSyncExternalStore(
    noopSubscribe,
    () => document.body,
    () => null,
  );
  return (
    <section
      aria-label={title}
      data-scheme={scheme}
      className={cn(
        'rounded-xl border border-line bg-canvas p-4 text-ink sm:p-6',
        schemeClass(scheme),
      )}
    >
      {body
        ? createPortal(
            <div
              ref={setLayer}
              data-scheme={scheme}
              className={schemeClass(scheme)}
            />,
            body,
          )
        : null}
      <UNSAFE_PortalProvider getContainer={() => layer ?? document.body}>
        <h2 className="eyebrow mb-6 text-accent">{title}</h2>
        <div className="flex flex-col gap-10">{children}</div>
      </UNSAFE_PortalProvider>
    </section>
  );
}

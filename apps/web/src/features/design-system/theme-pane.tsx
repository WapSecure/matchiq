'use client';

import { type ReactNode, useRef } from 'react';
import { UNSAFE_PortalProvider } from 'react-aria';
import { cn } from '@/lib/cn';

/**
 * Pins a colour scheme for its subtree. Overlays portal into the pane rather
 * than `<body>`, so a popover opened in the dark pane is dark too.
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
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section
      aria-label={title}
      data-scheme={scheme}
      className={cn(
        'relative rounded-xl border border-line bg-canvas p-4 text-ink sm:p-6',
        scheme === 'dark' ? 'scheme-dark' : 'scheme-light',
      )}
    >
      <div ref={ref} />
      <UNSAFE_PortalProvider getContainer={() => ref.current}>
        <h2 className="eyebrow mb-6 text-accent">{title}</h2>
        <div className="flex flex-col gap-10">{children}</div>
      </UNSAFE_PortalProvider>
    </section>
  );
}

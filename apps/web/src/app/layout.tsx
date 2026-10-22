import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { SessionLoader } from '@/components/auth/session-loader';
import { PwaPrompts } from '@/components/pwa/pwa-prompts';
import { PWA_METADATA, PWA_THEME_COLOR } from '@/constants/pwa';
import { SITE } from '@/constants/site';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme-script';
import './global.css';

export const metadata: Metadata = {
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  robots: { index: false, follow: false },
  ...PWA_METADATA,
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  colorScheme: 'light dark',
};

/** Per-request rendering lets Next stamp the CSP nonce from `proxy.ts` on its scripts. */
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  return (
    <html
      lang={SITE.locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      // The theme script sets `data-theme` before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* Allowed by its CSP hash, not the nonce; see lib/security/csp.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <SessionLoader />
        {children}
        <PwaPrompts />
      </body>
    </html>
  );
}

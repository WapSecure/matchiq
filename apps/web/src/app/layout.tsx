import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { SessionExpiredNotice } from '@/components/auth/session-expired-notice';
import { SessionLoader } from '@/components/auth/session-loader';
import { PwaPrompts } from '@/components/pwa/pwa-prompts';
import { PWA_METADATA, PWA_THEME_COLOR } from '@/constants/pwa';
import { NONCE_HEADER } from '@/constants/security';
import { SITE } from '@/constants/site';
import { InterfaceLanguageSync } from '@/features/interface-language/interface-language-sync';
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
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html
      lang={SITE.locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      // The theme script sets `data-theme` before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* React Aria reads this nonce for the small style elements it injects. */}
        <meta property="csp-nonce" nonce={nonce} />
        {/* Allowed by its CSP hash, not the nonce; see lib/security/csp.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <InterfaceLanguageSync />
        <SessionLoader />
        <SessionExpiredNotice />
        {children}
        <PwaPrompts />
      </body>
    </html>
  );
}

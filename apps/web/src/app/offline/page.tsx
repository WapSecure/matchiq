import type { Metadata } from 'next';
import {
  SiteFooter,
  SiteHeader,
  SkipLink,
  SyntheticNotice,
} from '@/components/layout';
import { PWA_COPY } from '@/constants/pwa';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { OfflineContent } from '@/features/pwa/offline-content';

export const metadata: Metadata = { title: PWA_COPY.offline.metaTitle };

/**
 * Precached by `public/sw.js` and served for any navigation that fails offline.
 * Rendered per request like every page so its scripts carry the CSP nonce; the
 * cached copy keeps the matching CSP header.
 */
export default function OfflinePage() {
  return (
    <>
      <SkipLink />
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <OfflineContent />
      </main>
      <SiteFooter />
    </>
  );
}

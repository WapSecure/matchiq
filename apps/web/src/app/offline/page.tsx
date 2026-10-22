import type { Metadata } from 'next';
import {
  SiteFooter,
  SiteHeader,
  SkipLink,
  SyntheticNotice,
} from '@/components/layout';
import { RefreshIcon } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { PWA_COPY } from '@/constants/pwa';
import { MAIN_CONTENT_ID } from '@/constants/site';

export const metadata: Metadata = { title: PWA_COPY.offline.metaTitle };

/**
 * Precached by `public/sw.js` and served for any navigation that fails offline.
 * Rendered per request like every page so its scripts carry the CSP nonce; the
 * cached copy keeps the matching CSP header.
 */
export default function OfflinePage() {
  const copy = PWA_COPY.offline;
  return (
    <>
      <SkipLink />
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <Container className="py-16 sm:py-24">
          <div className="mx-auto max-w-xl text-center">
            <p className="eyebrow text-accent">{copy.eyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              {copy.description}
            </p>
            <ButtonLink
              href=""
              variant="secondary"
              size="md"
              className="mt-8"
              leadingIcon={<RefreshIcon size={16} />}
            >
              {copy.retry}
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

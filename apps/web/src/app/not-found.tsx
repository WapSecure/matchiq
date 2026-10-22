import type { Metadata } from 'next';
import {
  SiteFooter,
  SiteHeader,
  SkipLink,
  SyntheticNotice,
} from '@/components/layout';
import { ButtonLink, Container } from '@/components/ui';
import { MAIN_CONTENT_ID, NOT_FOUND_COPY } from '@/constants/site';

export const metadata: Metadata = { title: NOT_FOUND_COPY.metaTitle };

/** Replaces Next's built-in 404, whose inline `<style>` the page CSP blocks. */
export default function NotFound() {
  const copy = NOT_FOUND_COPY;
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
              href={copy.href}
              variant="secondary"
              size="md"
              className="mt-8"
            >
              {copy.action}
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

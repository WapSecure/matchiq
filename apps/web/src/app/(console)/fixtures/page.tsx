import type { Metadata } from 'next';
import { SiteFooter, SiteHeader, SyntheticNotice } from '@/components/layout';
import { Container } from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { FixtureLobby } from '@/features/lobby/fixture-lobby';

export const metadata: Metadata = { title: LOBBY_COPY.metaTitle };

export default function FixturesPage() {
  return (
    <>
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <Container className="py-10 sm:py-14">
          <header className="max-w-2xl">
            <p className="eyebrow text-accent">{LOBBY_COPY.eyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {LOBBY_COPY.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              {LOBBY_COPY.description}
            </p>
          </header>
          <div className="mt-8">
            <FixtureLobby />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

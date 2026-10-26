import type { Metadata } from 'next';
import { SiteFooter, SiteHeader, SyntheticNotice } from '@/components/layout';
import { LOBBY_COPY } from '@/constants/lobby';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { FixturesContent } from '@/features/lobby/fixtures-content';

export const metadata: Metadata = { title: LOBBY_COPY.metaTitle };

export default function FixturesPage() {
  return (
    <>
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <FixturesContent />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from 'next';
import {
  SiteFooter,
  SiteHeader,
  SkipLink,
  SyntheticNotice,
} from '@/components/layout';
import { GUIDE_COPY } from '@/constants/guide';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { GuidePage } from '@/features/guide/guide-page';

export const metadata: Metadata = { title: GUIDE_COPY.metaTitle };

export default function Page() {
  return (
    <>
      <SkipLink />
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} className="min-h-[60dvh]">
        <GuidePage />
      </main>
      <SiteFooter />
    </>
  );
}

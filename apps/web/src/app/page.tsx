import {
  SiteFooter,
  SiteHeader,
  SkipLink,
  SyntheticNotice,
} from '@/components/layout';
import {
  HeroSection,
  PipelineSection,
  PrinciplesSection,
} from '@/features/landing';
import { MAIN_CONTENT_ID } from '@/constants/site';

export default function LandingPage() {
  return (
    <>
      <SkipLink />
      <SyntheticNotice />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID}>
        <HeroSection />
        <PipelineSection />
        <PrinciplesSection />
      </main>
      <SiteFooter />
    </>
  );
}

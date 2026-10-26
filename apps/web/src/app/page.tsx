import {
  SiteFooter,
  SiteHeader,
  SkipLink,
  SyntheticNotice,
} from '@/components/layout';
import {
  CapabilitiesSection,
  GallerySection,
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
        <GallerySection />
        <PipelineSection />
        <CapabilitiesSection />
        <PrinciplesSection />
      </main>
      <SiteFooter />
    </>
  );
}

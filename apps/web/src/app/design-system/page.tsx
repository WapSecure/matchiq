import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SkipLink, SyntheticNotice } from '@/components/layout';
import { GALLERY_COPY } from '@/constants/design-system';
import { DesignSystemGallery } from '@/features/design-system/design-system-gallery';
import { isGalleryEnabled } from '@/lib/design-system-gate';

export const metadata: Metadata = { title: GALLERY_COPY.metaTitle };

/** Hidden (404) in production unless the public demo is enabled. */
export default function DesignSystemPage() {
  if (!isGalleryEnabled()) notFound();
  return (
    <>
      <SkipLink />
      <SyntheticNotice />
      <DesignSystemGallery />
    </>
  );
}

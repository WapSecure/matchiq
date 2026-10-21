import { FixtureId } from '@matchiq/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { STUDIO_COPY } from '@/constants/studio';
import { LiveStudio } from '@/features/studio/live-studio';

type StudioPageProps = { params: Promise<{ fixtureId: string }> };

export const metadata: Metadata = { title: STUDIO_COPY.metaTitle };

export default async function StudioPage({ params }: StudioPageProps) {
  const { fixtureId } = await params;
  const parsed = FixtureId.safeParse(decodeURIComponent(fixtureId));
  if (!parsed.success) notFound();
  return <LiveStudio fixtureId={parsed.data} />;
}

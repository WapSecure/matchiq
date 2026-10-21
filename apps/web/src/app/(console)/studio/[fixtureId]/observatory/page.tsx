import { FixtureId } from '@matchiq/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import { ObservatoryScreen } from '@/features/studio/session-screens';

type PageProps = { params: Promise<{ fixtureId: string }> };

export const metadata: Metadata = { title: OBSERVATORY_COPY.metaTitle };

export default async function ObservatoryPage({ params }: PageProps) {
  const { fixtureId } = await params;
  const parsed = FixtureId.safeParse(decodeURIComponent(fixtureId));
  if (!parsed.success) notFound();
  return <ObservatoryScreen fixtureId={parsed.data} />;
}

import { FixtureId } from '@matchiq/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RECAP_COPY } from '@/constants/recap';
import { RecapScreen } from '@/features/studio/session-screens';

type PageProps = { params: Promise<{ fixtureId: string }> };

export const metadata: Metadata = { title: RECAP_COPY.metaTitle };

export default async function RecapPage({ params }: PageProps) {
  const { fixtureId } = await params;
  const parsed = FixtureId.safeParse(decodeURIComponent(fixtureId));
  if (!parsed.success) notFound();
  return <RecapScreen fixtureId={parsed.data} />;
}

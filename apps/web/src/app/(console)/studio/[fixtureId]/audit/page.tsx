import { FixtureId } from '@matchiq/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AUDIT_COPY } from '@/constants/audit';
import { AuditScreen } from '@/features/studio/session-screens';

type PageProps = { params: Promise<{ fixtureId: string }> };

export const metadata: Metadata = { title: AUDIT_COPY.metaTitle };

export default async function AuditPage({ params }: PageProps) {
  const { fixtureId } = await params;
  const parsed = FixtureId.safeParse(decodeURIComponent(fixtureId));
  if (!parsed.success) notFound();
  return <AuditScreen fixtureId={parsed.data} />;
}

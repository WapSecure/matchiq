import type { Metadata } from 'next';
import { RegionBoundary } from '@/components/feedback';
import { SiteFooter, SiteHeader, SyntheticNotice } from '@/components/layout';
import { REGION_NAMES } from '@/constants/errors';
import { ButtonLink, Container, InfoTip } from '@/components/ui';
import { GUIDE_COPY } from '@/constants/guide';
import { ROUTES } from '@/constants/navigation';
import { LOBBY_COPY } from '@/constants/lobby';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { RecentSessions } from '@/features/lobby/recent-sessions';
import { TemplateLobby } from '@/features/lobby/template-lobby';

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
            <div className="mt-3 flex items-start gap-1.5">
              <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
                {LOBBY_COPY.description}
              </p>
              <InfoTip
                label={LOBBY_COPY.howItWorks.label}
                content={LOBBY_COPY.howItWorks.text}
                className="-mt-0.5 sm:mt-0"
              />
            </div>
            <ButtonLink
              href={ROUTES.guide}
              variant="ghost"
              size="sm"
              className="-ml-2.5 mt-3"
            >
              {GUIDE_COPY.title}
            </ButtonLink>
          </header>
          <div className="mt-8">
            <RegionBoundary region={REGION_NAMES.matches}>
              <TemplateLobby />
            </RegionBoundary>
          </div>
          <div className="mt-10">
            <RegionBoundary region={REGION_NAMES.replays}>
              <RecentSessions />
            </RegionBoundary>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

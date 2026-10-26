'use client';

import { RegionBoundary } from '@/components/feedback';
import { ButtonLink, Container, InfoTip } from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { RecentSessions } from './recent-sessions';
import { TemplateLobby } from './template-lobby';

export function FixturesContent() {
  const copy = usePageMessages().lobby;
  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow text-accent">{copy.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {copy.title}
        </h1>
        <div className="mt-3 flex items-start gap-1.5">
          <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
            {copy.description}
          </p>
          <InfoTip
            label={copy.howItWorks.label}
            content={copy.howItWorks.text}
            className="-mt-0.5 sm:mt-0"
          />
        </div>
        <ButtonLink
          href={ROUTES.guide}
          variant="ghost"
          size="sm"
          className="-ml-2.5 mt-3"
        >
          {copy.guide}
        </ButtonLink>
      </header>
      <div className="mt-8">
        <RegionBoundary region={copy.regions.matches}>
          <TemplateLobby />
        </RegionBoundary>
      </div>
      <div className="mt-10">
        <RegionBoundary region={copy.regions.replays}>
          <RecentSessions />
        </RegionBoundary>
      </div>
    </Container>
  );
}

'use client';

import { TeamMonogram } from '@/components/match/team-monogram';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';

type Team = FixtureTemplateSummary['home'];

function TeamColumn({
  team,
  side,
  label,
}: {
  team: Team;
  side: 'home' | 'away';
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamMonogram shortName={team.shortName} side={side} size="lg" />
      <span className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-balance text-ink">
        {team.name}
      </span>
      <span className="eyebrow text-ink-subtle">{label}</span>
    </div>
  );
}

/** The matchup as the card's hero; the heading carries the same title for assistive tech. */
export function MatchHero({
  template,
  titleId,
}: {
  template: FixtureTemplateSummary;
  titleId: string;
}) {
  const copy = usePageMessages().lobby;
  return (
    <div>
      <h2 id={titleId} className="sr-only">
        {template.title}
      </h2>
      <div
        aria-hidden
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3"
      >
        <TeamColumn team={template.home} side="home" label={copy.home} />
        <span className="mt-3 rounded-full border border-line bg-surface-raised px-2 py-0.5 text-micro font-medium text-ink-subtle uppercase">
          {copy.versus}
        </span>
        <TeamColumn team={template.away} side="away" label={copy.away} />
      </div>
    </div>
  );
}

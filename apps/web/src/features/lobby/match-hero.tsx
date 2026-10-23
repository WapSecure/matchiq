import { TeamMonogram } from '@/components/match/team-monogram';
import { LOBBY_COPY } from '@/constants/lobby';
import { SIDE_LABELS } from '@/constants/match';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';

type Team = FixtureTemplateSummary['home'];

function TeamColumn({ team, side }: { team: Team; side: 'home' | 'away' }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamMonogram shortName={team.shortName} side={side} size="lg" />
      <span className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-balance text-ink">
        {team.name}
      </span>
      <span className="eyebrow text-ink-subtle">{SIDE_LABELS[side]}</span>
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
  return (
    <div>
      <h2 id={titleId} className="sr-only">
        {template.title}
      </h2>
      <div
        aria-hidden
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3"
      >
        <TeamColumn team={template.home} side="home" />
        <span className="mt-3 rounded-full border border-line bg-surface-raised px-2 py-0.5 text-micro font-medium text-ink-subtle uppercase">
          {LOBBY_COPY.versus}
        </span>
        <TeamColumn team={template.away} side="away" />
      </div>
    </div>
  );
}

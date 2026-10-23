import type { Fixture } from '@matchiq/contracts';
import { TeamMonogram } from '@/components/match/team-monogram';
import { SIDE_BG, type Side as TeamSide } from '@/components/match/team-swatch';
import { MatchCodeChip } from '@/components/match/match-code-chip';
import { Badge } from '@/components/ui';
import { RECAP_COPY } from '@/constants/recap';
import { WATERMARK } from '@/constants/studio';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { useMatchLabel } from '@/lib/use-match-label';
import { ExportRecap } from './export-recap';
import { RecapStory } from './recap-story';

type RecapScorelineProps = {
  fixture: Fixture;
  recap: RecapDocument;
};

function Side({ team, side }: { team: Fixture['home']; side: TeamSide }) {
  return (
    <span
      className={`relative flex min-w-0 items-center gap-3 self-stretch ${side === 'away' ? 'flex-row-reverse pr-4 text-right' : 'pl-4'}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 w-1 rounded-full ${side === 'away' ? 'right-0' : 'left-0'} ${SIDE_BG[side]}`}
      />
      <span className="hidden sm:flex">
        <TeamMonogram shortName={team.shortName} side={side} size="lg" />
      </span>
      <span className="truncate text-lg font-semibold tracking-tight text-ink sm:text-2xl">
        <span className="sm:hidden">{team.shortName}</span>
        <span className="hidden sm:inline">{team.name}</span>
      </span>
    </span>
  );
}

/** The headline result, then the story in words. */
export function RecapScoreline({ fixture, recap }: RecapScorelineProps) {
  const { home, away } = recap.finalSnapshot.score;
  const { code } = useMatchLabel(fixture.fixtureId);
  return (
    <section
      aria-label={RECAP_COPY.scoreLabel(
        fixture.home.name,
        fixture.away.name,
        home,
        away,
      )}
      className="relative overflow-hidden rounded-lg border border-line bg-surface px-4 py-5 shadow-panel sm:px-8 sm:py-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent-soft/60 to-transparent"
      />
      <div className="relative flex flex-wrap items-center gap-x-2 gap-y-2">
        <p className="eyebrow text-accent">{RECAP_COPY.eyebrow}</p>
        <span className="text-xs text-ink-subtle">
          {fixture.competitionLabel}
        </span>
        <Badge tone="synthetic">{WATERMARK}</Badge>
        <ExportRecap
          recap={recap}
          fixture={fixture}
          className="w-full sm:ml-auto sm:w-auto"
        />
      </div>
      {code ? <MatchCodeChip code={code} className="mt-3" /> : null}
      <div
        aria-hidden
        className="relative mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6"
      >
        <Side team={fixture.home} side="home" />
        <span className="tabular rounded-lg border border-line bg-surface-sunken px-4 py-2 font-mono text-4xl font-semibold tracking-tight text-ink shadow-panel sm:px-6 sm:text-6xl">
          {home}–{away}
        </span>
        <Side team={fixture.away} side="away" />
      </div>
      <RecapStory recap={recap} fixture={fixture} />
    </section>
  );
}

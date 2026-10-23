import type { Fixture, MatchSnapshot } from '@matchiq/contracts';
import { TeamMonogram } from '@/components/match/team-monogram';
import { SIDE_BG, type Side as TeamSide } from '@/components/match/team-swatch';
import { MatchCodeChip } from '@/components/match/match-code-chip';
import { Badge } from '@/components/ui';
import { RECAP_COPY } from '@/constants/recap';
import { WATERMARK } from '@/constants/studio';
import { ExportRecap } from './export-recap';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { useMatchLabel } from '@/lib/use-match-label';

type RecapScorelineProps = {
  fixture: Fixture;
  snapshot: MatchSnapshot;
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

/** The headline result. */
export function RecapScoreline({
  fixture,
  snapshot,
  recap,
}: RecapScorelineProps) {
  const { home, away } = snapshot.score;
  const { code } = useMatchLabel(fixture.fixtureId);
  return (
    <section
      aria-label={RECAP_COPY.scoreLabel(
        fixture.home.name,
        fixture.away.name,
        home,
        away,
      )}
      className="rounded-lg border border-line bg-surface px-4 py-6 shadow-panel sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="eyebrow text-accent">{RECAP_COPY.eyebrow}</p>
        <Badge tone="synthetic">{WATERMARK}</Badge>
        <span className="font-mono text-micro text-ink-subtle">
          {RECAP_COPY.engine(snapshot.algorithmVersion)}
        </span>
        <ExportRecap recap={recap} className="ml-auto" />
      </div>
      {code ? <MatchCodeChip code={code} className="mt-3" /> : null}
      <div
        aria-hidden
        className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6"
      >
        <Side team={fixture.home} side="home" />
        <span className="tabular rounded-lg border border-line bg-surface-sunken px-4 py-2 font-mono text-4xl font-semibold tracking-tight text-ink sm:px-6 sm:text-6xl">
          {home}–{away}
        </span>
        <Side team={fixture.away} side="away" />
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">
        {RECAP_COPY.fullTime} · {fixture.competitionLabel}
      </p>
    </section>
  );
}

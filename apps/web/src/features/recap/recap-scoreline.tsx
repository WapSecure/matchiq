import type { Fixture, MatchSnapshot } from '@matchiq/contracts';
import { TeamSwatch } from '@/components/match/team-swatch';
import { Badge } from '@/components/ui';
import { RECAP_COPY } from '@/constants/recap';
import { WATERMARK } from '@/constants/studio';
import { ExportRecap } from './export-recap';
import type { RecapDocument } from '@/lib/api/session-schemas';

type RecapScorelineProps = {
  fixture: Fixture;
  snapshot: MatchSnapshot;
  recap: RecapDocument;
};

function Side({ name, side }: { name: string; side: 'home' | 'away' }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${side === 'away' ? 'flex-row-reverse text-right' : ''}`}
    >
      <TeamSwatch side={side} className="size-3" />
      <span className="truncate text-lg font-semibold text-ink sm:text-2xl">
        {name}
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
  return (
    <section
      aria-label={RECAP_COPY.scoreLabel(
        fixture.home.name,
        fixture.away.name,
        home,
        away,
      )}
      className="rounded-lg border border-line bg-surface px-4 py-6 sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="eyebrow text-accent">{RECAP_COPY.eyebrow}</p>
        <Badge tone="synthetic">{WATERMARK}</Badge>
        <span className="font-mono text-micro text-ink-subtle">
          {RECAP_COPY.engine(snapshot.algorithmVersion)}
        </span>
        <ExportRecap recap={recap} className="ml-auto" />
      </div>
      <div
        aria-hidden
        className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6"
      >
        <Side name={fixture.home.name} side="home" />
        <span className="tabular rounded-md bg-surface-raised px-3 py-1 font-mono text-3xl font-semibold text-ink sm:text-5xl">
          {home}–{away}
        </span>
        <Side name={fixture.away.name} side="away" />
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">
        {RECAP_COPY.fullTime} · {fixture.competitionLabel}
      </p>
    </section>
  );
}

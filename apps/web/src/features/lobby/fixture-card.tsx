import type { Fixture } from '@matchiq/contracts';
import { TeamSwatch } from '@/components/match/team-swatch';
import { Badge } from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { FIXTURE_STATUS_LABELS } from '@/constants/match';
import { WATERMARK } from '@/constants/studio';
import { formatKickoff } from '@/lib/format';
import { StartReplay } from './start-replay';

function TeamLine({
  team,
  side,
}: {
  team: Fixture['home'];
  side: 'home' | 'away';
}) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamSwatch side={side} className="size-3" />
      <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
        {team.name}
      </span>
      <span className="font-mono text-xs text-ink-subtle">
        {team.shortName}
      </span>
      <span className="tabular w-16 whitespace-nowrap text-right font-mono text-xs text-ink-subtle">
        {team.formation}
      </span>
    </div>
  );
}

function Facts({ fixture }: { fixture: Fixture }) {
  const rows: [string, string][] = [
    [LOBBY_COPY.kickoff, formatKickoff(fixture.kickoffUtc)],
    [LOBBY_COPY.scenario, fixture.provenance.scenario],
    [LOBBY_COPY.seedLabel, String(fixture.provenance.seed)],
  ];
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-subtle">{label}</dt>
          <dd className="tabular truncate text-right text-ink-muted">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  const titleId = `${fixture.fixtureId}-title`;
  const live = fixture.status === 'LIVE';
  return (
    <article
      aria-labelledby={titleId}
      className="flex w-full min-w-0 flex-col rounded-lg border border-line bg-surface transition-colors hover:border-line-strong"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <Badge tone={live ? 'accent' : 'neutral'} dot={live}>
          {FIXTURE_STATUS_LABELS[fixture.status]}
        </Badge>
        <Badge tone="synthetic" className="ml-auto">
          {WATERMARK}
        </Badge>
      </header>
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow truncate">{fixture.competitionLabel}</p>
          <h2
            id={titleId}
            className="mt-1 truncate text-sm font-medium text-ink-muted"
          >
            {fixture.title}
          </h2>
        </div>
        <TeamLine team={fixture.home} side="home" />
        <TeamLine team={fixture.away} side="away" />
        <Facts fixture={fixture} />
      </div>
      <footer className="mt-auto border-t border-line px-5 py-3">
        <StartReplay fixtureId={fixture.fixtureId} />
      </footer>
    </article>
  );
}

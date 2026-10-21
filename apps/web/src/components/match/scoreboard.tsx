import type { MatchPhase } from '@matchiq/contracts';
import { cn } from '@/lib/cn';
import { MatchClock } from './match-clock';
import { type Side, TeamSwatch } from './team-swatch';

export type ScoreboardTeam = { name: string; shortName: string };

export type ScoreboardProps = {
  home: ScoreboardTeam;
  away: ScoreboardTeam;
  score: { home: number; away: number } | null;
  period: number | null;
  clockMs: number;
  phase: MatchPhase | null;
  label: string;
  className?: string;
};

const NO_SCORE = '–';

function TeamName({ team, side }: { team: ScoreboardTeam; side: Side }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2.5',
        side === 'away' && 'flex-row-reverse text-right',
      )}
    >
      <TeamSwatch side={side} className="size-3" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink sm:text-base">
          <span className="sm:hidden">{team.shortName}</span>
          <span className="hidden sm:inline">{team.name}</span>
        </p>
        <p className="eyebrow hidden sm:block">{team.shortName}</p>
      </div>
    </div>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <span
      aria-hidden
      className="tabular w-8 text-center font-mono text-3xl font-semibold leading-none text-ink sm:w-10 sm:text-4xl"
    >
      {value ?? NO_SCORE}
    </span>
  );
}

export function Scoreboard({
  home,
  away,
  score,
  period,
  clockMs,
  phase,
  label,
  className,
}: ScoreboardProps) {
  const summary = score
    ? `${home.name} ${score.home}, ${away.name} ${score.away}`
    : `${home.name} v ${away.name}`;
  return (
    <section
      aria-label={label}
      className={cn('flex items-center gap-3 sm:gap-6', className)}
    >
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
      <TeamName team={home} side="home" />
      <div className="flex items-center gap-2 sm:gap-4">
        <Score value={score?.home ?? null} />
        <MatchClock period={period} ms={clockMs} phase={phase} />
        <Score value={score?.away ?? null} />
      </div>
      <TeamName team={away} side="away" />
    </section>
  );
}

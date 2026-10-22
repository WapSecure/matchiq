import type { MatchPhase } from '@matchiq/contracts';
import type { ReactNode } from 'react';
import { SIDE_LABELS } from '@/constants/match';
import { cn } from '@/lib/cn';
import { MatchClock } from './match-clock';
import { TeamMonogram } from './team-monogram';
import { SIDE_BG, type Side } from './team-swatch';

export type ScoreboardTeam = { name: string; shortName: string };

export type ScoreboardProps = {
  home: ScoreboardTeam;
  away: ScoreboardTeam;
  score: { home: number; away: number } | null;
  period: number | null;
  clockMs: number;
  phase: MatchPhase | null;
  label: string;
  /** Provenance line under the clock: engine version, provisional state. */
  meta?: ReactNode;
  className?: string;
};

const NO_SCORE = '–';

function TeamBlock({ team, side }: { team: ScoreboardTeam; side: Side }) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 items-center gap-3 self-stretch py-1',
        side === 'home'
          ? 'pl-3 @lg:pl-4'
          : 'flex-row-reverse pr-3 text-right @lg:pr-4',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 w-1 rounded-full',
          side === 'home' ? 'left-0' : 'right-0',
          SIDE_BG[side],
        )}
      />
      <span className="hidden @lg:flex">
        <TeamMonogram shortName={team.shortName} side={side} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-ink @2xl:text-lg">
          <span className="@2xl:hidden">{team.shortName}</span>
          <span className="hidden @2xl:inline">{team.name}</span>
        </p>
        <p className="eyebrow">{SIDE_LABELS[side]}</p>
      </div>
    </div>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <span
      aria-hidden
      className="tabular min-w-[1.5ch] text-center font-mono text-4xl font-semibold leading-none tracking-tight text-ink @2xl:text-5xl"
    >
      {value ?? NO_SCORE}
    </span>
  );
}

/** Broadcast scoreboard: team bars, crest-free monograms, score and clock. */
export function Scoreboard({
  home,
  away,
  score,
  period,
  clockMs,
  phase,
  label,
  meta,
  className,
}: ScoreboardProps) {
  const summary = score
    ? `${home.name} ${score.home}, ${away.name} ${score.away}`
    : `${home.name} v ${away.name}`;
  return (
    <section aria-label={label} className={cn('@container', className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 @lg:gap-6">
        <p className="sr-only" aria-live="polite">
          {summary}
        </p>
        <TeamBlock team={home} side="home" />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 @lg:gap-5">
            <Score value={score?.home ?? null} />
            <span aria-hidden className="h-8 w-px bg-line-strong" />
            <Score value={score?.away ?? null} />
          </div>
          <MatchClock
            period={period}
            ms={clockMs}
            phase={phase}
            className="rounded-md border border-line bg-surface-sunken px-3 py-1.5"
          />
          {meta}
        </div>
        <TeamBlock team={away} side="away" />
      </div>
    </section>
  );
}

import { cn } from '@/lib/cn';

export type Scorebug = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  clock: string;
};

function TeamCode({ code, side }: { code: string; side: 'home' | 'away' }) {
  return (
    <span className="relative flex items-center px-[1.1cqw] font-mono tracking-[0.08em]">
      {code}
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-[0.6cqw] bottom-[0.35cqw] h-[0.3cqw] min-h-0.5 rounded-full',
          side === 'home' ? 'bg-home' : 'bg-away',
        )}
      />
    </span>
  );
}

/** Top-left score bug: team codes with colour bars, score slab and clock. */
export function OverlayScorebug({ bug }: { bug: Scorebug }) {
  return (
    <div className="flex h-[max(22px,3.6cqw)] items-stretch overflow-hidden rounded-[0.45cqw] bg-surface-sunken/90 text-[max(10px,1.55cqw)] font-semibold text-ink shadow-float ring-1 ring-white/10 backdrop-blur-sm">
      <TeamCode code={bug.home} side="home" />
      <span className="tabular flex items-center gap-[0.7cqw] bg-ink px-[1cqw] font-mono text-canvas">
        <span>{bug.homeScore}</span>
        <span aria-hidden className="opacity-50">
          –
        </span>
        <span>{bug.awayScore}</span>
      </span>
      <TeamCode code={bug.away} side="away" />
      <span className="tabular flex items-center border-l border-white/10 bg-white/5 px-[1cqw] font-mono text-ink-muted">
        {bug.clock}
      </span>
    </div>
  );
}

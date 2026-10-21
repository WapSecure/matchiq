import type { MatchPhase } from '@matchiq/contracts';
import { PERIOD_LABELS, PHASE_LABELS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/format';

type MatchClockProps = {
  period: number | null;
  ms: number;
  phase: MatchPhase | null;
  className?: string;
};

const EMPTY = '—';

export function MatchClock({ period, ms, phase, className }: MatchClockProps) {
  const periodLabel = period === null ? null : PERIOD_LABELS[period];
  const phaseLabel = phase === null ? null : PHASE_LABELS[phase];
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <p className="tabular font-mono text-lg font-semibold leading-none text-ink sm:text-xl">
        <span className="sr-only">{STUDIO_COPY.metrics.clock} </span>
        {formatClock(period, ms)}
      </p>
      <p className="eyebrow whitespace-nowrap">
        {[periodLabel, phaseLabel].filter(Boolean).join(' · ') || EMPTY}
      </p>
    </div>
  );
}

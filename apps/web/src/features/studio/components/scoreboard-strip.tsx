'use client';

import type { Fixture } from '@matchiq/contracts';
import { Scoreboard } from '@/components/match/scoreboard';
import { Badge } from '@/components/ui';
import { STUDIO_COPY } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { useMatchStore } from '../store';

function Provenance() {
  const snapshot = useMatchStore((s) => s.snapshot);
  if (!snapshot) {
    return (
      <span className="text-micro text-ink-subtle">
        {STUDIO_COPY.awaitingSnapshot}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center justify-center gap-2 text-micro text-ink-subtle">
      <span className="font-mono">
        {STUDIO_COPY.algorithm(snapshot.algorithmVersion)}
      </span>
      {snapshot.provisional ? (
        <Badge tone="warning" title={STUDIO_COPY.provisionalHint}>
          {STUDIO_COPY.provisional}
        </Badge>
      ) : null}
    </span>
  );
}

/** The scoreboard card that heads the studio's primary column. */
export function ScoreboardStrip({
  fixture,
  className,
}: {
  fixture: Fixture;
  className?: string;
}) {
  const score = useMatchStore((s) => s.snapshot?.score ?? null);
  const phase = useMatchStore((s) => s.snapshot?.phase ?? null);
  const clock = useMatchStore((s) => s.clock);
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface px-3 py-4 shadow-panel sm:px-5',
        className,
      )}
    >
      <Scoreboard
        label={STUDIO_COPY.scoreboardLabel}
        home={fixture.home}
        away={fixture.away}
        score={score}
        period={clock.period}
        clockMs={clock.ms}
        phase={phase}
        meta={<Provenance />}
      />
    </div>
  );
}

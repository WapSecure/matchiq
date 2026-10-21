'use client';

import type { Fixture } from '@matchiq/contracts';
import { Scoreboard } from '@/components/match/scoreboard';
import { Badge } from '@/components/ui';
import { STUDIO_COPY } from '@/constants/studio';
import { useMatchStore } from '../store';

export function ScoreboardStrip({ fixture }: { fixture: Fixture }) {
  const snapshot = useMatchStore((s) => s.snapshot);
  const clock = useMatchStore((s) => s.clock);
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-2 px-4 py-3 lg:px-6">
        <Scoreboard
          label={STUDIO_COPY.scoreboardLabel}
          home={fixture.home}
          away={fixture.away}
          score={snapshot?.score ?? null}
          period={clock.period}
          clockMs={clock.ms}
          phase={snapshot?.phase ?? null}
          className="mx-auto w-full max-w-4xl"
        />
        <div className="flex flex-wrap items-center justify-center gap-2 text-micro text-ink-subtle">
          {snapshot ? (
            <>
              <span className="font-mono">
                {STUDIO_COPY.algorithm(snapshot.algorithmVersion)}
              </span>
              {snapshot.provisional ? (
                <Badge tone="neutral" title={STUDIO_COPY.provisionalHint}>
                  {STUDIO_COPY.provisional}
                </Badge>
              ) : null}
            </>
          ) : (
            <span>{STUDIO_COPY.awaitingSnapshot}</span>
          )}
        </div>
      </div>
    </div>
  );
}

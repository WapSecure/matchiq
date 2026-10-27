import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback';
import { PITCH_COORD_MAX, type PitchTeamFilter } from '@/constants/pitch';
import {
  DEPTH_COPY,
  type DifficultyBand,
  PASS_STROKE,
  PASS_TOP_N,
} from '@/constants/pitch-depth';
import { DepthCanvas } from './depth-canvas';
import { DepthTable } from './depth-table';
import { MarkStepper } from './mark-stepper';
import { PassArrowMark } from './pass-arrow';
import { type PassArrow, selectPasses } from './pitch-passes';

type PassMapProps = {
  arrows: readonly PassArrow[];
  team: PitchTeamFilter;
  length: number;
  width: number;
};

const BAND_ORDER: DifficultyBand[] = ['lower', 'medium', 'higher'];

function PassLegend() {
  const c = DEPTH_COPY.passes;
  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow">{c.legendTitle}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-ink-muted">
        {BAND_ORDER.map((band) => (
          <li key={band} className="flex items-center gap-1.5">
            <svg aria-hidden viewBox="0 0 20 4" className="h-4 w-8 shrink-0">
              <line
                x1={1}
                y1={2}
                x2={19}
                y2={2}
                strokeWidth={PASS_STROKE[band].width * 2.2}
                strokeDasharray={PASS_STROKE[band].dash
                  ?.split(' ')
                  .map((n) => Number(n) * 2.2)
                  .join(' ')}
                strokeLinecap="round"
                className="stroke-ink-muted"
              />
            </svg>
            {c.bands[band]}
          </li>
        ))}
      </ul>
    </div>
  );
}

const readout = (p: PassArrow): string =>
  [
    p.minute,
    p.teamShort,
    p.player,
    DEPTH_COPY.distance(p.distanceM),
    `${DEPTH_COPY.passes.legendTitle} ${DEPTH_COPY.difficulty(p.difficulty)}`,
    p.underPressure ? DEPTH_COPY.passes.pressure : null,
  ]
    .filter(Boolean)
    .join(' · ');

/** The hardest completed passes per team as arrows, with a table of the same passes. */
export function PassMap({ arrows, team, length, width }: PassMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { shown, total } = useMemo(
    () => selectPasses(arrows, team),
    [arrows, team],
  );
  const c = DEPTH_COPY.passes;
  const active = shown.find((p) => p.id === activeId) ?? null;
  if (shown.length === 0) {
    return <EmptyState compact title={c.empty} description={c.emptyHint} />;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-muted">
        {c.rule(PASS_TOP_N)}{' '}
        <span className="tabular font-mono">
          {c.shown(shown.length, total)}
        </span>
      </p>
      <DepthCanvas
        length={length}
        width={width}
        title={c.title}
        description={c.summary(shown.length)}
        onLeave={() => setActiveId(null)}
      >
        {shown.map((p) => (
          <PassArrowMark
            key={p.id}
            pass={p}
            sx={length / PITCH_COORD_MAX}
            sy={width / PITCH_COORD_MAX}
            dimmed={activeId !== null && activeId !== p.id}
            active={p.id === activeId}
            onActivate={setActiveId}
          />
        ))}
      </DepthCanvas>
      <PassLegend />
      <MarkStepper
        ids={shown.map((p) => p.id)}
        activeId={active?.id ?? null}
        onActivate={setActiveId}
        readout={active ? readout(active) : c.hint}
      />
      <DepthTable
        caption={c.title}
        columns={Object.values(c.columns)}
        rows={shown.map((p) => ({
          id: p.id,
          cells: [
            p.minute,
            p.teamShort,
            p.player ?? DEPTH_COPY.none,
            DEPTH_COPY.distance(p.distanceM),
            DEPTH_COPY.difficulty(p.difficulty),
          ],
        }))}
      />
    </div>
  );
}

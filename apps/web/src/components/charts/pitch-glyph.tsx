import type { Side } from '@/components/match/team-swatch';
import { PITCH_MARK, type PitchKind } from '@/constants/pitch';
import { cn } from '@/lib/cn';

const FILL: Record<Side, string> = { home: 'fill-home', away: 'fill-away' };
const STROKE: Record<Side, string> = {
  home: 'stroke-home',
  away: 'stroke-away',
};
const DIAMOND = 1.2;
const TRIANGLE = 1.25;
const GOAL_HALO = 0.85;
const HALO_STROKE = 0.35;

type PitchGlyphProps = {
  kind: PitchKind;
  side: Side;
  /** Shots only: filled when on target, hollow otherwise. */
  onTarget?: boolean | null;
  cx?: number;
  cy?: number;
  active?: boolean;
};

/**
 * Event type is carried by shape (circle, ringed circle, diamond, arrowhead)
 * and team by colour plus attacking direction, so neither relies on colour.
 */
export function PitchGlyph({
  kind,
  side,
  onTarget = true,
  cx = 0,
  cy = 0,
  active = false,
}: PitchGlyphProps) {
  const r = PITCH_MARK.radius * (active ? 1.35 : 1);
  const ring = cn('stroke-pitch', FILL[side]);
  const t = `translate(${cx} ${cy})`;
  if (kind === 'GOAL') {
    const g = PITCH_MARK.goalRadius * (active ? 1.2 : 1);
    return (
      <g transform={t}>
        <circle
          r={g + GOAL_HALO}
          fill="none"
          strokeWidth={HALO_STROKE}
          className={STROKE[side]}
        />
        <circle r={g} strokeWidth={PITCH_MARK.ring} className={ring} />
      </g>
    );
  }
  if (kind === 'RECOVERY') {
    const d = r * DIAMOND;
    return (
      <polygon
        transform={t}
        points={`0,${-d} ${d},0 0,${d} ${-d},0`}
        strokeWidth={PITCH_MARK.ring}
        className={ring}
      />
    );
  }
  if (kind === 'FINAL_THIRD_ENTRY') {
    const a = r * TRIANGLE;
    const dir = side === 'home' ? 1 : -1;
    return (
      <polygon
        transform={t}
        points={`${dir * a},0 ${-dir * a},${-a} ${-dir * a * 0.35},0 ${-dir * a},${a}`}
        strokeWidth={PITCH_MARK.ring}
        className={ring}
      />
    );
  }
  return (
    <circle
      transform={t}
      r={r}
      strokeWidth={PITCH_MARK.ring}
      className={onTarget === false ? cn('fill-pitch', STROKE[side]) : ring}
    />
  );
}

/** Legend swatch: one glyph in a 16 px box. */
export function GlyphSwatch(props: Omit<PitchGlyphProps, 'cx' | 'cy'>) {
  return (
    <svg aria-hidden viewBox="-2.8 -2.8 5.6 5.6" className="size-4 shrink-0">
      <PitchGlyph {...props} />
    </svg>
  );
}

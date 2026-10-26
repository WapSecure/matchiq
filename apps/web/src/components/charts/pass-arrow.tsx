import {
  PASS_HEAD,
  PASS_HIT_WIDTH,
  PASS_STROKE,
} from '@/constants/pitch-depth';
import { cn } from '@/lib/cn';
import type { PassArrow } from './pitch-passes';

type PassArrowMarkProps = {
  pass: PassArrow;
  sx: number;
  sy: number;
  dimmed: boolean;
  active: boolean;
  onActivate: (id: string) => void;
};

const STROKE = { home: 'stroke-home', away: 'stroke-away' };
const FILL = { home: 'fill-home', away: 'fill-away' };

type Point = { x: number; y: number };

const headPoints = (from: Point, to: Point, size: number): string => {
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ux = (to.x - from.x) / len;
  const uy = (to.y - from.y) / len;
  const bx = to.x - ux * size;
  const by = to.y - uy * size;
  const px = -uy * size * 0.5;
  const py = ux * size * 0.5;
  return `${to.x},${to.y} ${bx + px},${by + py} ${bx - px},${by - py}`;
};

/** One pass: width and dash carry difficulty, colour carries the team. */
export function PassArrowMark({
  pass: p,
  sx,
  sy,
  dimmed,
  active,
  onActivate,
}: PassArrowMarkProps) {
  const [x1, y1, x2, y2] = [
    p.from.x * sx,
    p.from.y * sy,
    p.to.x * sx,
    p.to.y * sy,
  ];
  const stroke = PASS_STROKE[p.band];
  return (
    <g
      data-pass={p.band}
      data-side={p.side}
      onPointerEnter={() => onActivate(p.id)}
      onClick={() => onActivate(p.id)}
      className={cn(
        'cursor-pointer transition-opacity duration-150 motion-reduce:transition-none',
        dimmed && 'opacity-30',
      )}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={PASS_HIT_WIDTH}
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={stroke.width * (active ? 1.5 : 1)}
        strokeDasharray={stroke.dash}
        strokeLinecap="round"
        className={STROKE[p.side]}
      />
      <polygon
        points={headPoints({ x: x1, y: y1 }, { x: x2, y: y2 }, PASS_HEAD)}
        className={FILL[p.side]}
      />
    </g>
  );
}

import { PITCH_MARKINGS_M as M } from '@/constants/pitch';

type PitchMarkingsProps = {
  /** Pitch length and width in metres; the parent viewBox uses the same units. */
  length: number;
  width: number;
  striped?: boolean;
};

const arcHalfChord = Math.sqrt(
  M.centreCircle ** 2 - (M.penaltyBox - M.penaltySpot) ** 2,
);

/** IFAB markings in metres, drawn inside an SVG whose viewBox is the pitch. */
export function PitchMarkings({
  length,
  width,
  striped = true,
}: PitchMarkingsProps) {
  const cy = width / 2;
  const box = (depth: number, span: number, end: 'left' | 'right') => (
    <rect
      x={end === 'left' ? 0 : length - depth}
      y={cy - span / 2}
      width={depth}
      height={span}
    />
  );
  const arc = (end: 'left' | 'right') => {
    const x = end === 'left' ? M.penaltyBox : length - M.penaltyBox;
    const sweep = end === 'left' ? 1 : 0;
    return `M${x},${cy - arcHalfChord}A${M.centreCircle},${M.centreCircle} 0 0 ${sweep} ${x},${cy + arcHalfChord}`;
  };
  const stripe = length / M.stripes;
  return (
    <g aria-hidden>
      <rect width={length} height={width} className="fill-pitch" />
      {striped
        ? Array.from({ length: M.stripes / 2 }, (_, i) => (
            <rect
              key={i}
              x={(i * 2 + 1) * stripe}
              width={stripe}
              height={width}
              className="fill-pitch-stripe"
            />
          ))
        : null}
      <g
        fill="none"
        className="stroke-pitch-line [&>*]:[vector-effect:non-scaling-stroke]"
        strokeWidth={M.lineWidthPx}
      >
        <rect width={length} height={width} />
        <path d={`M${length / 2},0V${width}`} />
        <circle cx={length / 2} cy={cy} r={M.centreCircle} />
        {box(M.penaltyBox, M.penaltyBoxWidth, 'left')}
        {box(M.penaltyBox, M.penaltyBoxWidth, 'right')}
        {box(M.goalArea, M.goalAreaWidth, 'left')}
        {box(M.goalArea, M.goalAreaWidth, 'right')}
        <path d={arc('left')} />
        <path d={arc('right')} />
      </g>
      <g className="fill-pitch-line">
        <circle cx={length / 2} cy={cy} r={M.spot} />
        <circle cx={M.penaltySpot} cy={cy} r={M.spot} />
        <circle cx={length - M.penaltySpot} cy={cy} r={M.spot} />
      </g>
    </g>
  );
}

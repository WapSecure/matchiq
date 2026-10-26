import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';
import { PitchMarkings } from './pitch-markings';

type DepthCanvasProps = {
  length: number;
  width: number;
  title: string;
  description: string;
  onLeave: () => void;
  children: ReactNode;
};

/** Pitch backdrop in metres for the shot and pass layers. */
export function DepthCanvas({
  length,
  width,
  title,
  description,
  onLeave,
  children,
}: DepthCanvasProps) {
  const titleId = useId();
  const descId = useId();
  return (
    <svg
      viewBox={`0 0 ${length} ${width}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className={cn('block h-auto w-full rounded-md ring-1 ring-line')}
      onPointerLeave={onLeave}
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      <PitchMarkings length={length} width={width} />
      {children}
    </svg>
  );
}

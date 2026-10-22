import { DEFAULT_PITCH } from '@/constants/pitch';
import { cn } from '@/lib/cn';
import { PitchMarkings } from './pitch-markings';

/**
 * Decorative stand-in for program video: the pitch tilted toward a wide-angle
 * camera position, so graphics are judged against something pitch-like.
 */
export function PitchBackdrop({ className }: { className?: string }) {
  const { lengthM, widthM } = DEFAULT_PITCH;
  return (
    <div
      aria-hidden
      className={cn('absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute inset-x-[-26%] bottom-[-34%] top-[-46%] [perspective:60cqw]">
        <svg
          viewBox={`0 0 ${lengthM} ${widthM}`}
          preserveAspectRatio="none"
          className="h-full w-full origin-bottom [transform:rotateX(44deg)]"
        >
          <PitchMarkings length={lengthM} width={widthM} />
        </svg>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_100%,transparent_30%,var(--mq-canvas)_88%)]" />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-canvas to-transparent" />
    </div>
  );
}

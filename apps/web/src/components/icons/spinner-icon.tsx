import { cn } from '@/lib/cn';
import { IconBase, type IconProps } from './icon';

/** Spins only when motion is allowed; reduced motion shows a static arc. */
export function SpinnerIcon({ className, ...props }: IconProps) {
  return (
    <IconBase {...props} className={cn('motion-safe:animate-spin', className)}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
    </IconBase>
  );
}

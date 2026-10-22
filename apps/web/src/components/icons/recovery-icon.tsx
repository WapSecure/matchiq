import { IconBase, type IconProps } from './icon';

export function RecoveryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v4h-4" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </IconBase>
  );
}

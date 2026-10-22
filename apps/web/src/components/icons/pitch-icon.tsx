import { IconBase, type IconProps } from './icon';

export function PitchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M2.5 9.5h2.5v5H2.5M21.5 9.5H19v5h2.5" />
    </IconBase>
  );
}

import { IconBase, type IconProps } from './icon';

export function DeterministicIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16M15 4v16M4 9h16M4 15h16" />
    </IconBase>
  );
}

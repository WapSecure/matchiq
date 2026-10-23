import { IconBase, type IconProps } from './icon';

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </IconBase>
  );
}

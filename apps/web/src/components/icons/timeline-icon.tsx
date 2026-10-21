import { IconBase, type IconProps } from './icon';

export function TimelineIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4v16" />
      <circle cx="6" cy="8" r="1.5" />
      <circle cx="6" cy="16" r="1.5" />
      <path d="M10 8h9" />
      <path d="M10 16h6" />
    </IconBase>
  );
}

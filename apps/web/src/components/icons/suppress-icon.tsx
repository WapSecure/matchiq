import { IconBase, type IconProps } from './icon';

export function SuppressIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

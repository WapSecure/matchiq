import { IconBase, type IconProps } from './icon';

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </IconBase>
  );
}

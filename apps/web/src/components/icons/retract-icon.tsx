import { IconBase, type IconProps } from './icon';

export function RetractIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="11" rx="2" />
      <path d="M7 12.5h10" />
      <path d="m9.5 19.5 2.5-2.5 2.5 2.5" />
    </IconBase>
  );
}

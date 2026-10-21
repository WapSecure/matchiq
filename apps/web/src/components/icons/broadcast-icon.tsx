import { IconBase, type IconProps } from './icon';

export function BroadcastIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M8 21h8" />
      <path d="M7 13h6" />
    </IconBase>
  );
}

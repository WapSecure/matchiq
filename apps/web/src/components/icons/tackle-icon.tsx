import { IconBase, type IconProps } from './icon';

export function TackleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 18h7l3-3" />
      <path d="m14 15 6-6" />
      <circle cx="17" cy="16.5" r="2.5" />
    </IconBase>
  );
}

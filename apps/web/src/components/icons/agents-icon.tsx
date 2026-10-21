import { IconBase, type IconProps } from './icon';

export function AgentsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.5 6h7" />
      <path d="m7.3 8.2 3.4 7.6" />
      <path d="m16.7 8.2-3.4 7.6" />
    </IconBase>
  );
}

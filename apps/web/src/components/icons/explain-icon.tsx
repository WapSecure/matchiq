import { IconBase, type IconProps } from './icon';

export function ExplainIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
      <path d="M8 8h8M8 12h5" />
    </IconBase>
  );
}

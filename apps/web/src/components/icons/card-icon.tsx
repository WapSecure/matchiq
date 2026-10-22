import { IconBase, type IconProps } from './icon';

export function CardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="3.5" width="10" height="17" rx="1.5" fill="currentColor" />
    </IconBase>
  );
}

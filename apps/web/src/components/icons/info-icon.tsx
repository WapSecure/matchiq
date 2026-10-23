import { IconBase, type IconProps } from './icon';

export function InfoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.75v.01" />
    </IconBase>
  );
}

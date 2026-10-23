import { IconBase, type IconProps } from './icon';

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.75" />
    </IconBase>
  );
}

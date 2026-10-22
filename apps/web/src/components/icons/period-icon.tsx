import { IconBase, type IconProps } from './icon';

export function PeriodIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l2.5 2.5M10 3h4" />
    </IconBase>
  );
}

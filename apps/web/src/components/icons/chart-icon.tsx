import { IconBase, type IconProps } from './icon';

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4v16h16" />
      <path d="m7 15 4-4 3 3 5-6" />
    </IconBase>
  );
}

import { IconBase, type IconProps } from './icon';

export function GoalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 8 3.3 2.4-1.3 3.9h-4l-1.3-3.9Z" />
      <path d="M12 3.5V8M15.3 10.4l4.3-1.4M14 14.3l2.6 3.6M10 14.3l-2.6 3.6M8.7 10.4 4.4 9" />
    </IconBase>
  );
}

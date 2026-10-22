import { IconBase, type IconProps } from './icon';

export function WhistleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="14" r="5" />
      <path d="M12.5 10.5 20 8v4l-6.2 1.3" />
      <path d="M4 5.5 6 8M9 3.5V6" />
    </IconBase>
  );
}

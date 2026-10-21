import { IconBase, type IconProps } from './icon';

export function AlertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 2.5 20h19Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.5h.01" />
    </IconBase>
  );
}

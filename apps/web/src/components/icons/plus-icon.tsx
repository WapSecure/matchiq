import { IconBase, type IconProps } from './icon';

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </IconBase>
  );
}

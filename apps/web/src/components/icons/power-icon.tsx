import { IconBase, type IconProps } from './icon';

export function PowerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v8" />
      <path d="M6.6 6.6a7.5 7.5 0 1 0 10.8 0" />
    </IconBase>
  );
}

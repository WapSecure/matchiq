import { IconBase, type IconProps } from './icon';

export function FreezeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2.5v19" />
      <path d="m3.8 7.25 16.4 9.5" />
      <path d="m3.8 16.75 16.4-9.5" />
      <path d="m9.5 4 2.5 2.5L14.5 4" />
      <path d="m9.5 20 2.5-2.5 2.5 2.5" />
    </IconBase>
  );
}

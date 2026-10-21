import { IconBase, type IconProps } from './icon';

export function TrophyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 3" />
      <path d="M16 6h3a3 3 0 0 1-3 3" />
      <path d="M12 13v4" />
      <path d="M8 20h8" />
    </IconBase>
  );
}

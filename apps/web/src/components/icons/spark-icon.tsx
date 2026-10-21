import { IconBase, type IconProps } from './icon';

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m12 8 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5Z" />
    </IconBase>
  );
}

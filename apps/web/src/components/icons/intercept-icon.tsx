import { IconBase, type IconProps } from './icon';

export function InterceptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 12h7M14 12h7" />
      <path d="M12 5v14" />
    </IconBase>
  );
}

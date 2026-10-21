import { IconBase, type IconProps } from './icon';

export function RenderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M6 13h6M8 21h8M12 17v4" />
    </IconBase>
  );
}

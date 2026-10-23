import { IconBase, type IconProps } from './icon';

export function MoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={3} />
    </IconBase>
  );
}

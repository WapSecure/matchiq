import { IconBase, type IconProps } from './icon';

export function PersonalizeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </IconBase>
  );
}

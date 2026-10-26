import { IconBase, type IconProps } from './icon';

export function KeyboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9" />
    </IconBase>
  );
}

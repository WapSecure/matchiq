import { IconBase, type IconProps } from './icon';

export function LogoMark(props: IconProps) {
  return (
    <IconBase viewBox="0 0 32 32" strokeWidth={2} {...props}>
      <rect x="3" y="6" width="26" height="20" rx="3" />
      <path d="M16 6v20" />
      <circle cx="16" cy="16" r="3.5" />
      <path d="M3 12h3.5v8H3M29 12h-3.5v8H29" />
    </IconBase>
  );
}

import { IconBase, type IconProps } from './icon';

export function AuditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2.5h6v3H9z" />
      <path d="M8.5 10.5h7" />
      <path d="M8.5 14h7" />
      <path d="M8.5 17.5h4" />
    </IconBase>
  );
}

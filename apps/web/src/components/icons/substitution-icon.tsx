import { IconBase, type IconProps } from './icon';

export function SubstitutionIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 20V5M3.5 8.5 7 5l3.5 3.5" />
      <path d="M17 4v15M13.5 15.5 17 19l3.5-3.5" />
    </IconBase>
  );
}

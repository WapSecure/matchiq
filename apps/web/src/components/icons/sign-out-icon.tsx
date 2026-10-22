import { IconBase, type IconProps } from './icon';

export function SignOutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16 6 12l4-4" />
      <path d="M6 12h9" />
    </IconBase>
  );
}

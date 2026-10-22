import { IconBase, type IconProps } from './icon';

export function UndoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </IconBase>
  );
}

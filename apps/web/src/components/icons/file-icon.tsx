import { IconBase, type IconProps } from './icon';

export function FileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M14 3.5v5h5" />
    </IconBase>
  );
}

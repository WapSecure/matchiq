import { IconBase, type IconProps } from './icon';

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" />
      <path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />
    </IconBase>
  );
}

import { IconBase, type IconProps } from './icon';

export function IngestIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    </IconBase>
  );
}

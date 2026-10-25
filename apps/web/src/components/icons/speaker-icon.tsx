import { IconBase, type IconProps } from './icon';

export function SpeakerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
    </IconBase>
  );
}

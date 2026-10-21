import type { ReactNode, SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Accessible name; omit for decorative icons. */
  title?: string;
  size?: number;
};

type IconBaseProps = IconProps & { children: ReactNode; viewBox?: string };

export const ICON_DEFAULT_SIZE = 20;

/** Shared SVG frame: 24px grid, currentColor stroke, hidden from AT unless titled. */
export function IconBase({
  title,
  size = ICON_DEFAULT_SIZE,
  viewBox = '0 0 24 24',
  children,
  ...rest
}: IconBaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

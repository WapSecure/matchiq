export type Box = { top: number; bottom: number; left: number; right: number };
export type Size = { width: number; height: number };

export const PANEL_MARGIN = 8;
const GAP = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

/**
 * Fixed-position coordinates that keep the panel fully inside the viewport:
 * below the anchor if it fits, else above, else pinned inside the edges.
 */
export function placePanel(
  anchor: Box,
  panel: Size,
  viewport: Size,
): { top: number; left: number } {
  const left = clamp(
    anchor.right - panel.width,
    PANEL_MARGIN,
    Math.max(PANEL_MARGIN, viewport.width - panel.width - PANEL_MARGIN),
  );
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - panel.height;
  const fitsBelow = below + panel.height + PANEL_MARGIN <= viewport.height;
  const raw = fitsBelow
    ? below
    : above >= PANEL_MARGIN
      ? above
      : viewport.height;
  const top = clamp(
    raw,
    PANEL_MARGIN,
    Math.max(PANEL_MARGIN, viewport.height - panel.height - PANEL_MARGIN),
  );
  return { top, left };
}

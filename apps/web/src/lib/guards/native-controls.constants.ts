export const NATIVE_TAG = /<(select|dialog)\b/;
export const INPUT_TAG = /<input\b[\s\S]*?\/>/g;
export const BANNED_INPUT_TYPE =
  /\btype=["'](date|file|checkbox|radio|range|color)["']/;
export const SOURCE_FILE = /\.tsx$/;
export const TEST_FILE = /\.(spec|test)\.tsx?$/;

/**
 * Decorated exceptions, keyed by path relative to apps/web/src. Each keeps the
 * native element for behaviour the platform does best and hides or restyles
 * the browser chrome.
 */
export const NATIVE_CONTROL_ALLOWLIST: Readonly<Record<string, string>> = {
  'features/studio/components/seek-bar.tsx':
    'Replay seek range: a native range input gives keyboard, touch and screen-reader scrubbing; the track and thumb are restyled.',
  'components/ui/modal.tsx':
    'Modal dialog: native <dialog> supplies focus trapping, inertness and Escape handling; the surface is fully custom.',
  'components/ui/drawer.tsx':
    'Side sheet: the same native <dialog> behaviour as the modal, with a custom surface.',
  'components/charts/pitch-filters.tsx':
    'Pitch filter chips: a visually hidden checkbox inside a styled label chip; the browser checkbox is never painted.',
};

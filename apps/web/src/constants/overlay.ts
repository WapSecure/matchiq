import type { OverlayKind } from '@matchiq/contracts';

export type CueTone = 'accent' | 'score' | 'discipline';

/** Lower-third tab colour per cue kind; the tab always carries the kind label. */
export const CUE_KIND_TONE: Record<OverlayKind, CueTone> = {
  SCORE_UPDATE: 'score',
  KEY_MOMENT: 'accent',
  TACTICAL_INSIGHT: 'accent',
  STAT_COMPARISON: 'accent',
  DISCIPLINE: 'discipline',
  SUBSTITUTION: 'accent',
};

/**
 * Minimum real-time display for a cue. At 20–30× a 7 s match-clock window is
 * a quarter of a second of wall time, so the preview holds a cue at least this
 * long unless a newer cue replaces it or it is pulled (ADR-0013).
 */
export const CUE_MIN_DWELL_MS = 4_000;

/** Extended real-time hold for walk-through demos at 20–30× replay. */
export const CUE_EXTENDED_DWELL_MS = 10_000;

export const CUE_HOLD_MS = {
  standard: CUE_MIN_DWELL_MS,
  extended: CUE_EXTENDED_DWELL_MS,
} as const;

export type CueHold = keyof typeof CUE_HOLD_MS;

/**
 * `overlay.retract` reasons the worker sends when a cue simply ran its course
 * (`OVERLAY_END_REASONS` in the worker). Anything else is a real retraction
 * and takes the cue off air at once.
 */
export const NATURAL_CUE_ENDS: ReadonlySet<string> = new Set([
  'expired',
  'period ended',
  'match ended',
]);

export const OVERLAY_COPY = {
  cueLog: 'Recent graphics',
  ending: { EXPIRED: 'Finished', RETRACTED: 'Taken off air' },
  untitled: 'Untitled graphic',
  held: 'Kept on screen',
  heldHint: (seconds: number) =>
    `Its moment has passed, but it stays on screen for at least ${seconds} s so viewers can read it.`,
  priority: (p: number) => `Priority ${p}`,
  source: { AGENT: 'AI wording', TEMPLATE: 'Standard wording' },
  sourceHint:
    'Each graphic goes out first with standard wording, then switches to AI wording once that passes the fact check.',
  localeFallback: 'English graphic',
  standby: 'Standing by',
  lastAired: (headline: string) => `Last on air: ${headline}`,
  onAir: 'On air',
  standbyTally: 'Off air',
  programNote: 'The preview always uses broadcast colours',
  programNoteHint:
    'It stands in for the on-air picture, so it stays dark in light mode too.',
  holdLegend: 'Minimum time on screen',
  holdOptions: [
    {
      value: 'standard',
      label: 'Standard: at least 4 seconds on screen',
      short: '4 s',
    },
    {
      value: 'extended',
      label: 'Demo: at least 10 seconds on screen',
      short: '10 s',
    },
  ],
} as const;

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
  cueLog: 'Cue log',
  ending: { EXPIRED: 'Expired', RETRACTED: 'Retracted' },
  held: 'Held for display',
  heldHint: (seconds: number) =>
    `Its match-clock window has passed; shown for at least ${seconds} s of real time.`,
  priority: (p: number) => `Priority ${p}`,
  source: { AGENT: 'Agent copy', TEMPLATE: 'Template copy' },
  sourceHint:
    'Revision 1 uses the deterministic broadcast template; later revisions carry agent copy that passed the publish gate.',
  localeFallback: 'en-GB graphic',
  standby: 'Standing by',
  lastAired: (headline: string) => `Last on air: ${headline}`,
  holdLegend: 'Cue hold',
  holdOptions: [
    { value: 'standard', label: 'Standard cue hold, 4 seconds', short: '4 s' },
    {
      value: 'extended',
      label: 'Extended cue hold for demos, 10 seconds',
      short: '10 s',
    },
  ],
} as const;

import type { PossessionState, Side } from '../types.js';

/** A type alias (not an interface) so it is assignable to canonical `Json`. */
export type PossessionTotals = {
  readonly home: number;
  readonly away: number;
  readonly contested: number;
};

/**
 * Duration of the open segment up to `clockMs`. Segments never span periods
 * (period boundaries close them) and a clock that runs backwards contributes 0.
 */
const openDuration = (
  possession: PossessionState,
  period: number,
  clockMs: number,
): number => {
  const open = possession.open;
  if (open === null || open.period !== period) return 0;
  return Math.max(0, clockMs - open.startClockMs);
};

export const closeSegment = (
  possession: PossessionState,
  period: number,
  clockMs: number,
): PossessionState => {
  const open = possession.open;
  if (open === null) return possession;
  const duration = openDuration(possession, period, clockMs);
  if (open.owner === null) {
    return {
      ...possession,
      contestedMs: possession.contestedMs + duration,
      open: null,
    };
  }
  return {
    ...possession,
    controlMs: {
      ...possession.controlMs,
      [open.owner]: possession.controlMs[open.owner] + duration,
    },
    open: null,
  };
};

export const changePossession = (
  possession: PossessionState,
  owner: Side | null,
  period: number,
  clockMs: number,
): PossessionState => ({
  ...closeSegment(possession, period, clockMs),
  open: { owner, period, startClockMs: clockMs },
  changeEvents: possession.changeEvents + 1,
});

/** Closed segments plus the open segment accrued to the current clock. */
export const possessionTotals = (
  possession: PossessionState,
  period: number | null,
  clockMs: number,
): PossessionTotals => {
  const totals = {
    home: possession.controlMs.home,
    away: possession.controlMs.away,
    contested: possession.contestedMs,
  };
  const open = possession.open;
  if (open === null || period === null) return totals;
  const duration = openDuration(possession, period, clockMs);
  if (open.owner === null) {
    return { ...totals, contested: totals.contested + duration };
  }
  return { ...totals, [open.owner]: totals[open.owner] + duration };
};

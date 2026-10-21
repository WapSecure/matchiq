import type { OverlayCue } from '@matchiq/contracts';
import { STORE_LIMITS } from '@/constants/api';
import { NATURAL_CUE_ENDS } from '@/constants/overlay';
import type { MatchData, OverlayEntry, Retraction } from './types';

export type RetractPayload = {
  overlayId: string;
  revision: number;
  reason: string;
};

/** A stale or duplicate revision is a no-op (spec §44). */
export const reducePublish = (
  state: MatchData,
  cue: OverlayCue,
): Partial<MatchData> => {
  const entry = state.overlays[cue.overlayId];
  if (entry?.cue && entry.cue.revision >= cue.revision) return {};
  if (entry?.retracted && entry.retracted.revision >= cue.revision) return {};
  const next: OverlayEntry = { cue, retracted: null };
  return { overlays: { ...state.overlays, [cue.overlayId]: next } };
};

/**
 * Hydrated cues come from the read model with their lifecycle status, so an
 * ended cue is stored as ended and never goes back on air.
 */
export const reduceHydratedCue = (
  state: MatchData,
  cue: OverlayCue,
): Partial<MatchData> => {
  const published = reducePublish(state, cue);
  if (!published.overlays) return {};
  if (cue.status !== 'EXPIRED' && cue.status !== 'RETRACTED') return published;
  const ended: OverlayEntry = {
    cue,
    retracted: { revision: cue.revision, reason: cue.status.toLowerCase() },
  };
  return { overlays: { ...state.overlays, [cue.overlayId]: ended } };
};

const logEntry = (
  entry: OverlayEntry | undefined,
  payload: RetractPayload,
): Retraction => ({
  overlayId: payload.overlayId,
  headline: entry?.cue?.headline ?? null,
  reason: payload.reason,
  ending: NATURAL_CUE_ENDS.has(payload.reason) ? 'EXPIRED' : 'RETRACTED',
});

export const reduceRetract = (
  state: MatchData,
  payload: RetractPayload,
): Partial<MatchData> => {
  const entry = state.overlays[payload.overlayId];
  if (entry?.retracted && entry.retracted.revision >= payload.revision) {
    return {};
  }
  if (entry?.cue && entry.cue.revision > payload.revision) return {};
  const next: OverlayEntry = {
    cue: entry?.cue ?? null,
    retracted: { revision: payload.revision, reason: payload.reason },
  };
  const logged = logEntry(entry, payload);
  return {
    overlays: { ...state.overlays, [payload.overlayId]: next },
    retractions: [
      logged,
      ...state.retractions.filter((r) => r.overlayId !== payload.overlayId),
    ].slice(0, STORE_LIMITS.cueLogMax),
  };
};

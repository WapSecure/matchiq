import type { OverlayCue } from '@matchiq/contracts';
import { STORE_LIMITS } from '@/constants/api';
import type { MatchData, OverlayEntry } from './types';

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
  const retraction = {
    overlayId: payload.overlayId,
    headline: entry?.cue?.headline ?? null,
    reason: payload.reason,
  };
  return {
    overlays: { ...state.overlays, [payload.overlayId]: next },
    retractions: [retraction, ...state.retractions].slice(
      0,
      STORE_LIMITS.retractionsMax,
    ),
  };
};

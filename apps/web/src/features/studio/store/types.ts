import type {
  Insight,
  MatchEvent,
  MatchSnapshot,
  Narrative,
  OverlayCue,
  Period,
  ReplayStatus,
} from '@matchiq/contracts';
import type { z } from 'zod';
import type { ConnectionStatus } from '@/lib/stream';

export type MatchClock = { period: z.infer<typeof Period> | null; ms: number };

export type OverlayEntry = {
  /** `null` when a retraction arrived before its cue (tombstone). */
  cue: OverlayCue | null;
  retracted: { revision: number; reason: string } | null;
};

export type Retraction = {
  overlayId: string;
  headline: string | null;
  reason: string;
};

export type MomentumPoint = {
  period: number;
  clockMs: number;
  home: number | null;
  away: number | null;
};

/** Narratives keyed by insight, then by `${persona}:${locale}`. */
export type NarrativeIndex = Record<string, Record<string, Narrative>>;

export type MatchData = {
  fixtureId: string;
  snapshot: MatchSnapshot | null;
  replay: ReplayStatus | null;
  clock: MatchClock;
  timeline: MatchEvent[];
  lastEventSequence: number;
  voided: Record<string, string>;
  insights: Insight[];
  narratives: NarrativeIndex;
  overlays: Record<string, OverlayEntry>;
  retractions: Retraction[];
  momentum: MomentumPoint[];
  connection: ConnectionStatus;
  /** Incremented when local state can no longer be trusted (seek, gap). */
  resyncToken: number;
};

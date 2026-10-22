import type {
  EditorialStatus,
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

/** An ended cue: `EXPIRED` ran its match-clock window, `RETRACTED` was pulled. */
export type Retraction = {
  overlayId: string;
  headline: string | null;
  reason: string;
  ending: 'EXPIRED' | 'RETRACTED';
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
  /** Latest `editorial.status`; null until a freeze or kill switch is announced. */
  editorial: EditorialStatus | null;
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
  /** Incremented when REST read models must be (re)loaded: join or gap. */
  hydrationToken: number;
  /** True once the first hydration settled, even if a read model was empty. */
  hydrated: boolean;
};

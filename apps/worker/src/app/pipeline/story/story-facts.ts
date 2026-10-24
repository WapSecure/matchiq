import {
  CONTEXT_REFS,
  type Fixture,
  type Insight,
  type MatchSnapshot,
  type StoryCitation,
} from '@matchiq/contracts';

export type StorySide = 'home' | 'away';

export interface StoryMoment {
  readonly insight: Insight;
  readonly period: number;
  readonly side: StorySide;
  readonly team: string;
  readonly player?: string;
  readonly minute?: StoryCitation;
  /** Score after the goal, from the moment's own metrics. */
  readonly score?: {
    readonly home: StoryCitation;
    readonly away: StoryCitation;
  };
}

export interface StoryFacts {
  readonly home: string;
  readonly away: string;
  readonly goals: readonly StoryMoment[];
  readonly reds: readonly StoryMoment[];
  readonly swings: readonly StoryMoment[];
  readonly snapshot: MatchSnapshot;
}

const SWING_KINDS: ReadonlySet<Insight['kind']> = new Set([
  'MOMENTUM_SHIFT',
  'PRESSURE_SWING',
]);

/** Snapshot values the story may cite without an insight. */
export const SNAPSHOT_REFS = {
  goals: (side: StorySide) => `goals.${side}`,
  shots: (side: StorySide) => `shots.${side}`,
  onTarget: (side: StorySide) => `shotsOnTarget.${side}`,
} as const;

export const snapshotValue = (
  snapshot: MatchSnapshot,
  ref: string,
): number | undefined => {
  const [base, side] = ref.split('.');
  if (side !== 'home' && side !== 'away') return undefined;
  if (base === 'goals') return snapshot.score[side];
  if (base === 'shots') return snapshot[side].shots;
  if (base === 'shotsOnTarget') return snapshot[side].shotsOnTarget;
  return undefined;
};

export const momentMetric = (
  insight: Insight,
  ref: string,
): number | undefined =>
  insight.context?.metrics[ref] ?? insight.evidence.computedMetrics[ref];

const citeOf = (insight: Insight, ref: string): StoryCitation | undefined => {
  const value = momentMetric(insight, ref);
  return value === undefined
    ? undefined
    : { metricRef: ref, value, insightId: insight.insightId };
};

const scoreOf = (insight: Insight) => {
  const pick = (contextRef: string, evidenceRef: string) =>
    citeOf(insight, insight.context ? contextRef : evidenceRef);
  const home = pick(CONTEXT_REFS.scoreHome, SNAPSHOT_REFS.goals('home'));
  const away = pick(CONTEXT_REFS.scoreAway, SNAPSHOT_REFS.goals('away'));
  return home && away ? { home, away } : undefined;
};

const momentOf = (
  fixture: Fixture,
  entry: { insight: Insight; period: number },
): StoryMoment => {
  const { insight } = entry;
  const side: StorySide =
    insight.teamId === fixture.away.teamId ? 'away' : 'home';
  const player = [...fixture.home.players, ...fixture.away.players].find(
    (p) => p.playerId === insight.playerId,
  )?.displayName;
  const minute = citeOf(insight, CONTEXT_REFS.minute);
  const score = insight.kind === 'GOAL' ? scoreOf(insight) : undefined;
  return {
    insight,
    period: entry.period,
    side,
    team: fixture[side].name,
    ...(player === undefined ? {} : { player }),
    ...(minute === undefined ? {} : { minute }),
    ...(score === undefined ? {} : { score }),
  };
};

/** The engine facts the full-time story tells, in match order. */
export const storyFacts = (
  fixture: Fixture,
  snapshot: MatchSnapshot,
  insights: readonly { insight: Insight; period: number }[],
): StoryFacts => {
  const ordered = [...insights]
    .sort(
      (a, b) =>
        a.period - b.period || a.insight.matchClockMs - b.insight.matchClockMs,
    )
    .map((entry) => momentOf(fixture, entry));
  return {
    home: fixture.home.name,
    away: fixture.away.name,
    goals: ordered.filter((m) => m.insight.kind === 'GOAL'),
    reds: ordered.filter((m) => m.insight.kind === 'RED_CARD'),
    swings: ordered.filter((m) => SWING_KINDS.has(m.insight.kind)),
    snapshot,
  };
};

import type {
  CitedValue,
  ConfidenceLabel,
  Fixture,
  Insight,
  InsightKind,
  Locale,
} from '@matchiq/contracts';
import { WINDOW_SUFFIX } from '@matchiq/football-engine';

type Side = 'home' | 'away';

export interface TemplateFacts {
  readonly kind: InsightKind;
  readonly team: string;
  readonly opponent: string;
  readonly home: string;
  readonly away: string;
  readonly player?: string;
  readonly confidence: ConfidenceLabel;
  readonly confidenceText: string;
  /** Formatted cited values by fact key; every key here is in `cited`. */
  readonly v: Readonly<Record<string, string>>;
  /** True when every value the kind's copy needs is in the envelope. */
  readonly complete: boolean;
}

const now = (base: string, side: Side) =>
  `${base}.${side}.${WINDOW_SUFFIX.current}`;
const before = (base: string, side: Side) =>
  `${base}.${side}.${WINDOW_SUFFIX.previous}`;

/** Fact key -> metricRef for each kind; mirrors the engine's rule outputs. */
const REFS: Readonly<
  Record<InsightKind, (side: Side, opp: Side) => Record<string, string>>
> = {
  GOAL: (side) => ({
    homeGoals: 'goals.home',
    awayGoals: 'goals.away',
    shots: now('shots', side),
  }),
  RED_CARD: (side) => ({
    redCards: `redCards.${side}`,
    yellowCards: `yellowCards.${side}`,
  }),
  SHOT_BURST: (side, opp) => ({
    shots: now('shots', side),
    onTarget: now('shotsOnTarget', side),
    oppShots: now('shots', opp),
  }),
  HIGH_REGAINS: (side, opp) => ({
    high: now('highRecoveries', side),
    oppHigh: now('highRecoveries', opp),
  }),
  PRESSURE_SWING: (side) => ({
    pressures: now('pressures', side),
    previous: before('pressures', side),
  }),
  MOMENTUM_SHIFT: (side, opp) => ({
    momentum: now('momentum', side),
    oppMomentum: now('momentum', opp),
  }),
  PLAYER_MILESTONE: () => ({}),
};

const DECIMAL_LOCALES: ReadonlySet<Locale> = new Set(['fr-FR', 'es-ES']);

/** Engine values are already rounded; only the decimal separator is localised. */
export const formatNumber = (value: number, locale: Locale): string => {
  const text = String(value);
  return DECIMAL_LOCALES.has(locale) ? text.replace('.', ',') : text;
};

const sideOf = (fixture: Fixture, teamId: string | undefined): Side =>
  teamId === fixture.away.teamId ? 'away' : 'home';

const playerName = (fixture: Fixture, playerId: string | undefined) =>
  [...fixture.home.players, ...fixture.away.players].find(
    (p) => p.playerId === playerId,
  )?.displayName;

export const buildFacts = (
  insight: Insight,
  fixture: Fixture,
  locale: Locale,
  confidenceWords: Readonly<Record<ConfidenceLabel, string>>,
): { facts: TemplateFacts; cited: CitedValue[] } => {
  const side = sideOf(fixture, insight.teamId);
  const opp: Side = side === 'home' ? 'away' : 'home';
  const metrics = insight.evidence.computedMetrics;
  const refs = Object.entries(REFS[insight.kind](side, opp));
  const cited: CitedValue[] = [];
  const v: Record<string, string> = {};
  for (const [key, metricRef] of refs) {
    const value = metrics[metricRef];
    if (value === undefined) continue;
    cited.push({ metricRef, value });
    v[key] = formatNumber(value, locale);
  }
  const player = playerName(fixture, insight.playerId);
  return {
    cited,
    facts: {
      kind: insight.kind,
      team: fixture[side].name,
      opponent: fixture[opp].name,
      home: fixture.home.name,
      away: fixture.away.name,
      ...(player === undefined ? {} : { player }),
      confidence: insight.evidence.confidenceLabel,
      confidenceText: confidenceWords[insight.evidence.confidenceLabel],
      v,
      complete: cited.length === refs.length,
    },
  };
};

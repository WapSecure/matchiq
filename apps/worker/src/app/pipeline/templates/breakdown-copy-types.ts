import type {
  ContextMetric,
  InsightKind,
  MinutePhase,
  ScoreState,
} from '@matchiq/contracts';

export interface ComparisonWords {
  readonly team: string;
  readonly window: string;
  readonly recent: string;
  readonly label: string;
  readonly average: string;
  /** Absent when the opponent cannot be named. */
  readonly opponent?: { readonly name: string; readonly recent: string };
}

type Spells = readonly [string, string, string];

/**
 * Deterministic Analyst breakdown copy for one locale (MQ-068). Phrases hold
 * no digits: every number is a formatted cited value passed in.
 */
export interface BreakdownCopy {
  readonly regain: (team: string, seconds: string) => string;
  /** One clause without the full stop; `margin` is numeric for plurals. */
  readonly score: Readonly<
    Record<
      ScoreState,
      (
        team: string,
        margin: number,
        marginText: string,
        minute: string,
      ) => string
    >
  >;
  /** Clause appended to the score sentence, with its own leading comma or empty. */
  readonly phase: Readonly<Record<MinutePhase, string>>;
  readonly comparison: (words: ComparisonWords) => string;
  readonly rising: (label: string, spells: Spells) => string;
  readonly falling: (label: string, spells: Spells) => string;
  readonly previousGoal: (team: string, minute: string) => string;
  readonly previousSpell: (team: string, minute: string) => string;
  /** Used when the moment has no context (older insights). */
  readonly noContext: (team: string) => string;
  readonly watch: Readonly<Record<InsightKind, (team: string) => string>>;
  readonly watchGoal: Readonly<Record<ScoreState, (team: string) => string>>;
  /** [singular, plural] count labels. */
  readonly labels: Readonly<Record<ContextMetric, readonly [string, string]>>;
}

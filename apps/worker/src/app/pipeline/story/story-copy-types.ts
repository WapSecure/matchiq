/** A scorer or dismissed player, when the engine names one. */
export type Who = string | undefined;

export interface ScoreWords {
  readonly home: string;
  readonly away: string;
  readonly h: string;
  readonly a: string;
}

/**
 * Deterministic full-time story copy for one locale (MQ-068). Phrases hold no
 * digits; `at` is the locale's minute clause (" in minute 23") or empty.
 */
export interface StoryCopy {
  readonly at: (minute: string | undefined) => string;
  readonly goal: (scorer: Who, team: string, at: string) => string;
  readonly red: (player: Who, team: string, at: string) => string;
  readonly swing: (team: string, at: string) => string;
  readonly halfTime: (s: ScoreWords) => string;
  readonly goallessFirst: string;
  readonly goallessSecond: string;
  readonly quietSecond: string;
  readonly decisive: (scorer: Who, team: string, at: string) => string;
  readonly equaliser: (scorer: Who, team: string, at: string) => string;
  readonly redTurn: (team: string, at: string) => string;
  readonly noGoals: string;
  readonly win: (winner: string, loser: string, w: string, l: string) => string;
  readonly draw: (s: ScoreWords) => string;
  readonly shots: (
    home: string,
    homeShots: readonly [string, string],
    away: string,
    awayShots: readonly [string, string],
  ) => string;
  /** Livelier Fan wording for the same facts. */
  readonly fan: {
    readonly decisive: (scorer: Who, team: string, at: string) => string;
    readonly equaliser: (scorer: Who, team: string, at: string) => string;
    readonly noGoals: string;
    readonly win: (
      winner: string,
      loser: string,
      w: string,
      l: string,
    ) => string;
    readonly draw: (s: ScoreWords) => string;
  };
}

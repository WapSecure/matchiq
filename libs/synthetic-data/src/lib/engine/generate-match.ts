import type { Fixture, MatchEvent } from '@matchiq/contracts';
import { TIME } from '../constants.js';
import { buildFixture } from '../fixture-builder.js';
import { createRng, deriveSeed } from '../prng.js';
import { SCENARIOS } from '../scenarios.js';
import type { ScenarioName, Score, Side } from '../types.js';
import { EventSink } from './event-sink.js';
import { GameClock, type RegulationPeriod } from './game-clock.js';
import { CENTRE_SPOT } from './geometry.js';
import type { MatchState } from './match-state.js';
import { activateDueBeat, playStep } from './play-step.js';
import { kickOff, killBall } from './possession.js';
import { Roster } from './roster.js';
import { planSubstitutions, runDueSubstitutions } from './substitutions.js';

export interface GenerateMatchOptions {
  readonly seed: number;
  readonly scenario: ScenarioName;
  readonly kickoffUtc?: string;
}

export interface GeneratedMatch {
  readonly fixture: Fixture;
  readonly events: MatchEvent[];
  readonly score: Score;
}

const KICK_OFF_SIDE: Readonly<Record<RegulationPeriod, Side>> = {
  1: 'home',
  2: 'away',
};

const createState = (options: GenerateMatchOptions): MatchState => {
  const rng = createRng(deriveSeed(options.seed, options.scenario));
  const preset = SCENARIOS[options.scenario];
  const fixture = buildFixture({
    rng,
    seed: options.seed,
    scenario: preset,
    ...(options.kickoffUtc === undefined
      ? {}
      : { kickoffUtc: options.kickoffUtc }),
  });
  const clock = new GameClock(fixture.kickoffUtc, {
    1: rng.int(...TIME.stoppageMsRange[1]),
    2: rng.int(...TIME.stoppageMsRange[2]),
  });
  return {
    rng,
    preset,
    fixture,
    clock,
    sink: new EventSink(fixture.fixtureId, fixture.provenance, clock),
    rosters: { home: new Roster(fixture.home), away: new Roster(fixture.away) },
    score: { home: 0, away: 0 },
    pendingBeats: [...preset.beats].sort((a, b) => a.minute - b.minute),
    substitutionPlan: planSubstitutions(rng),
    activeBeat: null,
    possession: null,
    carrier: null,
    ball: CENTRE_SPOT,
    lastPass: null,
    underPressure: false,
  };
};

const playPeriod = (state: MatchState, period: RegulationPeriod): void => {
  state.clock.startPeriod(period);
  state.sink.emit({ type: 'PERIOD_STARTED' });
  runDueSubstitutions(state);
  kickOff(state, KICK_OFF_SIDE[period]);
  while (!state.clock.isPeriodOver) {
    activateDueBeat(state);
    playStep(state);
  }
  killBall(state);
  state.sink.emit({ type: 'PERIOD_ENDED' });
};

/** Pure function of (seed, scenario, kickoff): the same inputs always yield the same stream. */
export const generateMatch = (
  options: GenerateMatchOptions,
): GeneratedMatch => {
  const state = createState(options);
  state.sink.emit({ type: 'MATCH_STARTED' });
  playPeriod(state, 1);
  playPeriod(state, 2);
  state.sink.emit({ type: 'MATCH_ENDED' });
  return {
    fixture: state.fixture,
    events: state.sink.events,
    score: { ...state.score },
  };
};

import type { BreakdownCopy } from './breakdown-copy-types';

export const BREAKDOWN_EN: BreakdownCopy = {
  regain: (team, s) =>
    `${team} had won the ball back ${s} seconds before the goal.`,
  score: {
    LEADING: (team, _m, m, minute) =>
      `${team} lead by ${m} in minute ${minute}`,
    LEVEL: (_team, _m, _mt, minute) =>
      `The scores are level in minute ${minute}`,
    TRAILING: (team, _m, m, minute) =>
      `${team} trail by ${m} in minute ${minute}`,
  },
  phase: {
    EARLY: ', early in the match',
    FIRST_HALF: '',
    BEFORE_HALF_TIME: ', just before half-time',
    SECOND_HALF: '',
    FINAL_15: ', in the closing stages',
  },
  comparison: (w) =>
    `In the last ${w.window} minutes ${w.team} have ${w.recent} ${w.label}, against a match average of ${w.average} for a spell that long${
      w.opponent ? `; ${w.opponent.name} have ${w.opponent.recent}` : ''
    }.`,
  rising: (label, [a, b, c]) =>
    `Their ${label} have risen spell by spell: ${a}, ${b}, then ${c}.`,
  falling: (label, [a, b, c]) =>
    `Their ${label} have eased spell by spell: ${a}, ${b}, then ${c}.`,
  previousGoal: (team, m) => `${team} had also scored in minute ${m}.`,
  previousSpell: (team, m) => `${team} had a similar spell in minute ${m}.`,
  noContext: (team) => `This is a key moment in the match for ${team}.`,
  watch: {
    GOAL: (team) => `Watch whether ${team} can build on the goal.`,
    RED_CARD: (team) => `Watch how ${team} reorganise with a player fewer.`,
    SHOT_BURST: (team) =>
      `Watch whether ${team} can turn this pressure into clearer chances.`,
    HIGH_REGAINS: (team) =>
      `Watch whether ${team} can keep winning the ball this high up the pitch.`,
    PRESSURE_SWING: (team) =>
      `Watch whether ${team} can keep this pressure up.`,
    MOMENTUM_SHIFT: (team) =>
      `Watch whether ${team} can make this spell count.`,
    PLAYER_MILESTONE: (team) => `Watch how much more ${team} gets involved.`,
  },
  watchGoal: {
    LEADING: (team) => `Watch whether ${team} can protect the lead.`,
    LEVEL: (team) => `Watch whether ${team} can push on from the equaliser.`,
    TRAILING: (team) =>
      `Watch whether ${team} can keep pushing for an equaliser.`,
  },
  labels: {
    shots: ['shot', 'shots'],
    shotsOnTarget: ['shot on target', 'shots on target'],
    pressures: ['pressure', 'pressures'],
    recoveries: ['regain', 'regains'],
    highRecoveries: ['high regain', 'high regains'],
    finalThirdEntries: ['final-third entry', 'final-third entries'],
  },
};

import type { BreakdownCopy } from './breakdown-copy-types';

/** Nigerian Pidgin in the BBC Pidgin spelling; football terms stay in English. */
export const BREAKDOWN_PCM: BreakdownCopy = {
  regain: (team, s) =>
    `${team} don win di ball back ${s} seconds before di goal.`,
  score: {
    LEADING: (team, _m, m, minute) =>
      `${team} dey lead by ${m} for minute ${minute}`,
    LEVEL: (_team, _m, _mt, minute) =>
      `Di score dey level for minute ${minute}`,
    TRAILING: (team, _m, m, minute) =>
      `${team} dey behind by ${m} for minute ${minute}`,
  },
  phase: {
    EARLY: ', early for di match',
    FIRST_HALF: '',
    BEFORE_HALF_TIME: ', just before half-time',
    SECOND_HALF: '',
    FINAL_15: ', for di last part of di match',
  },
  comparison: (w) =>
    `For di last ${w.window} minutes, ${w.team} get ${w.recent} ${w.label}, against match average of ${w.average} for di same length of time${
      w.opponent ? `; ${w.opponent.name} get ${w.opponent.recent}` : ''
    }.`,
  rising: (label, [a, b, c]) =>
    `Their ${label} dey rise spell by spell: ${a}, ${b}, then ${c}.`,
  falling: (label, [a, b, c]) =>
    `Their ${label} dey reduce spell by spell: ${a}, ${b}, then ${c}.`,
  previousGoal: (team, m) => `${team} don score before for minute ${m}.`,
  previousSpell: (team, m) =>
    `${team} don get dis kain spell before for minute ${m}.`,
  noContext: (team) => `Dis na big moment for di match for ${team}.`,
  watch: {
    GOAL: (team) => `Watch whether ${team} fit build on dis goal.`,
    RED_CARD: (team) =>
      `Watch how ${team} go arrange demself with player wey don comot.`,
    SHOT_BURST: (team) =>
      `Watch whether ${team} fit turn dis pressure to better chances.`,
    HIGH_REGAINS: (team) =>
      `Watch whether ${team} fit dey win di ball for up like dis.`,
    PRESSURE_SWING: (team) => `Watch whether ${team} fit keep dis pressure.`,
    MOMENTUM_SHIFT: (team) => `Watch whether ${team} fit use dis spell well.`,
    PLAYER_MILESTONE: (team) => `Watch how ${team} go dey involved from here.`,
  },
  watchGoal: {
    LEADING: (team) => `Watch whether ${team} fit protect di lead.`,
    LEVEL: (team) => `Watch whether ${team} fit push on after di equaliser.`,
    TRAILING: (team) => `Watch whether ${team} fit keep pushing for equaliser.`,
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

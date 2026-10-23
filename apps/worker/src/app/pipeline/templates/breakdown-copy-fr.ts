import type { BreakdownCopy } from './breakdown-copy-types';

const goals = (margin: number, text: string) =>
  `${text} ${margin === 1 ? 'but' : 'buts'}`;

export const BREAKDOWN_FR: BreakdownCopy = {
  regain: (team, s) =>
    `${team} avait récupéré le ballon ${s} secondes avant le but.`,
  score: {
    LEADING: (team, m, mt, minute) =>
      `${team} mène de ${goals(m, mt)} à la minute ${minute}`,
    LEVEL: (_team, _m, _mt, minute) =>
      `Le score est à égalité à la minute ${minute}`,
    TRAILING: (team, m, mt, minute) =>
      `${team} est mené de ${goals(m, mt)} à la minute ${minute}`,
  },
  phase: {
    EARLY: ', en début de match',
    FIRST_HALF: '',
    BEFORE_HALF_TIME: ', juste avant la pause',
    SECOND_HALF: '',
    FINAL_15: ", dans le dernier quart d'heure",
  },
  comparison: (w) =>
    `Sur les ${w.window} dernières minutes, ${w.team} compte ${w.recent} ${w.label}, contre une moyenne de ${w.average} sur une période aussi longue depuis le coup d'envoi${
      w.opponent ? ` ; ${w.opponent.name} en compte ${w.opponent.recent}` : ''
    }.`,
  rising: (label, [a, b, c]) =>
    `Leurs ${label} augmentent d'une période à l'autre : ${a}, ${b}, puis ${c}.`,
  falling: (label, [a, b, c]) =>
    `Leurs ${label} diminuent d'une période à l'autre : ${a}, ${b}, puis ${c}.`,
  previousGoal: (team, m) => `${team} avait déjà marqué à la minute ${m}.`,
  previousSpell: (team, m) =>
    `${team} avait déjà connu un temps fort de ce type à la minute ${m}.`,
  noContext: (team) => `C'est un moment clé du match pour ${team}.`,
  watch: {
    GOAL: (team) => `Reste à voir si ${team} peut capitaliser sur ce but.`,
    RED_CARD: (team) =>
      `Reste à voir comment ${team} se réorganise avec un joueur en moins.`,
    SHOT_BURST: (team) =>
      `Reste à voir si ${team} peut transformer cette pression en occasions plus nettes.`,
    HIGH_REGAINS: (team) =>
      `Reste à voir si ${team} peut continuer à récupérer le ballon aussi haut.`,
    PRESSURE_SWING: (team) =>
      `Reste à voir si ${team} peut maintenir cette pression.`,
    MOMENTUM_SHIFT: (team) =>
      `Reste à voir si ${team} peut faire fructifier ce temps fort.`,
    PLAYER_MILESTONE: (team) =>
      `Reste à voir quel rôle ${team} peut encore tenir dans ce match.`,
  },
  watchGoal: {
    LEADING: (team) => `Reste à voir si ${team} peut conserver son avance.`,
    LEVEL: (team) =>
      `Reste à voir si ${team} peut enchaîner après l'égalisation.`,
    TRAILING: (team) =>
      `Reste à voir si ${team} peut continuer à pousser pour égaliser.`,
  },
  labels: {
    shots: ['tir', 'tirs'],
    shotsOnTarget: ['tir cadré', 'tirs cadrés'],
    pressures: ['pression', 'pressions'],
    recoveries: ['récupération', 'récupérations'],
    highRecoveries: ['récupération haute', 'récupérations hautes'],
    finalThirdEntries: [
      'entrée dans le dernier tiers',
      'entrées dans le dernier tiers',
    ],
  },
};

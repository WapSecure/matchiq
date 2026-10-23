import type { BreakdownCopy } from './breakdown-copy-types';

const goals = (margin: number, text: string) =>
  `${text} ${margin === 1 ? 'gol' : 'goles'}`;

export const BREAKDOWN_ES: BreakdownCopy = {
  regain: (team, s) =>
    `${team} había recuperado el balón ${s} segundos antes del gol.`,
  score: {
    LEADING: (team, m, mt, minute) =>
      `${team} gana por ${goals(m, mt)} en el minuto ${minute}`,
    LEVEL: (_team, _m, _mt, minute) =>
      `El marcador está igualado en el minuto ${minute}`,
    TRAILING: (team, m, mt, minute) =>
      `${team} pierde por ${goals(m, mt)} en el minuto ${minute}`,
  },
  phase: {
    EARLY: ', al comienzo del partido',
    FIRST_HALF: '',
    BEFORE_HALF_TIME: ', justo antes del descanso',
    SECOND_HALF: '',
    FINAL_15: ', en el tramo final',
  },
  comparison: (w) =>
    `En los últimos ${w.window} minutos, ${w.team} suma ${w.recent} ${w.label}, frente a una media de ${w.average} por cada tramo igual del partido${
      w.opponent ? `; ${w.opponent.name} suma ${w.opponent.recent}` : ''
    }.`,
  rising: (label, [a, b, c]) =>
    `Sus ${label} crecen tramo a tramo: ${a}, ${b} y luego ${c}.`,
  falling: (label, [a, b, c]) =>
    `Sus ${label} bajan tramo a tramo: ${a}, ${b} y luego ${c}.`,
  previousGoal: (team, m) => `${team} ya había marcado en el minuto ${m}.`,
  previousSpell: (team, m) => `${team} ya tuvo una fase así en el minuto ${m}.`,
  noContext: (team) => `Es un momento clave del partido para ${team}.`,
  watch: {
    GOAL: (team) => `Atención a si ${team} puede aprovechar el gol.`,
    RED_CARD: (team) =>
      `Atención a cómo se reorganiza ${team} con un jugador menos.`,
    SHOT_BURST: (team) =>
      `Atención a si ${team} puede convertir esta presión en ocasiones más claras.`,
    HIGH_REGAINS: (team) =>
      `Atención a si ${team} sigue recuperando el balón tan arriba.`,
    PRESSURE_SWING: (team) =>
      `Atención a si ${team} puede mantener esta presión.`,
    MOMENTUM_SHIFT: (team) =>
      `Atención a si ${team} puede sacar partido de este buen momento.`,
    PLAYER_MILESTONE: (team) =>
      `Atención a cuánto más participa ${team} en el juego.`,
  },
  watchGoal: {
    LEADING: (team) => `Atención a si ${team} puede proteger la ventaja.`,
    LEVEL: (team) => `Atención a si ${team} puede seguir tras el empate.`,
    TRAILING: (team) =>
      `Atención a si ${team} puede seguir empujando en busca del empate.`,
  },
  labels: {
    shots: ['tiro', 'tiros'],
    shotsOnTarget: ['tiro a puerta', 'tiros a puerta'],
    pressures: ['presión', 'presiones'],
    recoveries: ['recuperación', 'recuperaciones'],
    highRecoveries: ['recuperación alta', 'recuperaciones altas'],
    finalThirdEntries: [
      'entrada al último tercio',
      'entradas al último tercio',
    ],
  },
};

import type { StoryCopy } from './story-copy-types';

const by = (scorer: string | undefined, team: string) =>
  scorer === undefined ? team : `${scorer} para ${team}`;

export const STORY_ES: StoryCopy = {
  at: (m) => (m === undefined ? '' : ` en el minuto ${m}`),
  goal: (scorer, team, at) =>
    scorer === undefined
      ? `${team} marcó${at}.`
      : `${scorer} marcó para ${team}${at}.`,
  red: (player, team, at) =>
    player === undefined
      ? `${team} se quedó con un jugador menos por roja${at}.`
      : `${player} (${team}) fue expulsado${at}.`,
  swing: (team, at) => `El dominio pasó a ${team}${at}.`,
  halfTime: (s) => `Al descanso, ${s.home} ${s.h}–${s.a} ${s.away}.`,
  goallessFirst: 'La primera parte terminó sin goles.',
  goallessSecond: 'No hubo goles tras el descanso.',
  quietSecond: 'La segunda parte transcurrió sin momentos clave.',
  decisive: (scorer, team, at) =>
    `El momento decisivo llegó${at}, ${scorer === undefined ? `cuando ${team} se puso por delante para siempre` : `cuando ${scorer} puso por delante a ${team} para siempre`}.`,
  equaliser: (scorer, team, at) =>
    `La última palabra fue de ${by(scorer, team)}, que igualó${at}.`,
  redTurn: (team, at) =>
    `Tras la expulsión${at}, ${team} jugó con un jugador menos.`,
  noGoals: 'Ningún equipo encontró el camino al gol.',
  win: (winner, loser, w, l) => `${winner} gana a ${loser} ${w}–${l}.`,
  draw: (s) => `Resultado final: ${s.home} ${s.h}–${s.a} ${s.away}.`,
  shots: (home, [hs, ht], away, [as, at]) =>
    `${home} remató ${hs} veces, ${ht} a puerta; ${away} remató ${as}, ${at} a puerta.`,
  fan: {
    decisive: (scorer, team, at) =>
      `El gran momento${at}: ${by(scorer, team)}, y ya no miraron atrás.`,
    equaliser: (scorer, team, at) =>
      `Todo igualado al final: ${by(scorer, team)} empató${at}.`,
    noGoals: 'Mucho esfuerzo, pero ningún equipo encontró el gol.',
    win: (winner, loser, w, l) => `${winner} se impone a ${loser} ${w}–${l}.`,
    draw: (s) => `Reparto de puntos: ${s.home} ${s.h}–${s.a} ${s.away}.`,
  },
};

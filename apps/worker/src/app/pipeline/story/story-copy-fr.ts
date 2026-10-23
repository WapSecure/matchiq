import type { StoryCopy } from './story-copy-types';

const by = (scorer: string | undefined, team: string) =>
  scorer === undefined ? team : `${scorer} pour ${team}`;

export const STORY_FR: StoryCopy = {
  at: (m) => (m === undefined ? '' : ` à la minute ${m}`),
  goal: (scorer, team, at) =>
    scorer === undefined
      ? `${team} a marqué${at}.`
      : `${scorer} a marqué pour ${team}${at}.`,
  red: (player, team, at) =>
    player === undefined
      ? `${team} a perdu un joueur sur carton rouge${at}.`
      : `${player} (${team}) a été expulsé${at}.`,
  swing: (team, at) => `Le temps fort est passé du côté de ${team}${at}.`,
  halfTime: (s) => `C'était ${s.home} ${s.h}–${s.a} ${s.away} à la pause.`,
  goallessFirst: 'La première période s’est achevée sans but.',
  goallessSecond: 'Aucun but après la pause.',
  quietSecond: 'La seconde période s’est jouée sans moment clé.',
  decisive: (scorer, team, at) =>
    `Le moment décisif est arrivé${at}, ${scorer === undefined ? `quand ${team} a pris l'avantage pour de bon` : `quand ${scorer} a donné l'avantage pour de bon à ${team}`}.`,
  equaliser: (scorer, team, at) =>
    `Le dernier mot est revenu à ${by(scorer, team)}, qui a égalisé${at}.`,
  redTurn: (team, at) =>
    `Après l'expulsion${at}, ${team} a joué avec un joueur en moins.`,
  noGoals: 'Aucune équipe n’a trouvé la faille.',
  win: (winner, loser, w, l) => `${winner} bat ${loser} ${w}–${l}.`,
  draw: (s) => `Score final : ${s.home} ${s.h}–${s.a} ${s.away}.`,
  shots: (home, [hs, ht], away, [as, at]) =>
    `${home} a tenté ${hs} tirs dont ${ht} cadrés ; ${away} en a tenté ${as} dont ${at} cadrés.`,
  fan: {
    decisive: (scorer, team, at) =>
      `Le grand moment${at} : ${by(scorer, team)}, et l'équipe n'a plus rien lâché.`,
    equaliser: (scorer, team, at) =>
      `Tout le monde à égalité au bout : ${by(scorer, team)} a égalisé${at}.`,
    noGoals: 'Beaucoup d’efforts, mais aucune équipe n’a trouvé la faille.',
    win: (winner, loser, w, l) => `${winner} s'offre ${loser} ${w}–${l}.`,
    draw: (s) => `Match nul : ${s.home} ${s.h}–${s.a} ${s.away}.`,
  },
};

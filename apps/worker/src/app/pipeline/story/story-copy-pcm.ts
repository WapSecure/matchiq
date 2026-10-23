import type { StoryCopy } from './story-copy-types';

const by = (scorer: string | undefined, team: string) =>
  scorer === undefined ? team : `${scorer} for ${team}`;

/** Nigerian Pidgin in the BBC Pidgin spelling; football terms stay in English. */
export const STORY_PCM: StoryCopy = {
  at: (m) => (m === undefined ? '' : ` for minute ${m}`),
  goal: (scorer, team, at) =>
    scorer === undefined
      ? `${team} score${at}.`
      : `${scorer} score for ${team}${at}.`,
  red: (player, team, at) =>
    player === undefined
      ? `${team} lose player to red card${at}.`
      : `${player} of ${team} collect red card${at}.`,
  swing: (team, at) => `Momentum shift go ${team} side${at}.`,
  halfTime: (s) => `Na ${s.home} ${s.h}–${s.a} ${s.away} for half-time.`,
  goallessFirst: 'Nobody score for di first half.',
  goallessSecond: 'No goal after di break.',
  quietSecond: 'Di second half no get any big moment.',
  decisive: (scorer, team, at) =>
    `Di moment wey decide am come${at}, ${scorer === undefined ? `when ${team} go front for good` : `when ${scorer} put ${team} for front for good`}.`,
  equaliser: (scorer, team, at) =>
    `Di last word na ${by(scorer, team)}, wey level di match${at}.`,
  redTurn: (team, at) =>
    `From di red card${at}, ${team} play with player wey don comot.`,
  noGoals: 'Nobody fit find goal.',
  win: (winner, loser, w, l) => `${winner} beat ${loser} ${w}–${l}.`,
  draw: (s) => `Di match end ${s.home} ${s.h}–${s.a} ${s.away}.`,
  shots: (home, [hs, ht], away, [as, at]) =>
    `${home} get ${hs} shots, ${ht} on target; ${away} get ${as}, ${at} on target.`,
  fan: {
    decisive: (scorer, team, at) =>
      `Di big one land${at}: ${by(scorer, team)}, and dem no look back.`,
    equaliser: (scorer, team, at) =>
      `E level for di end: ${by(scorer, team)} equalise${at}.`,
    noGoals: 'Dem try well well, but nobody fit find goal.',
    win: (winner, loser, w, l) => `${winner} don beat ${loser} ${w}–${l}.`,
    draw: (s) => `Dem share di points: ${s.home} ${s.h}–${s.a} ${s.away}.`,
  },
};

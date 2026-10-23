import type { StoryCopy } from './story-copy-types';

const by = (scorer: string | undefined, team: string) =>
  scorer === undefined ? team : `${scorer} for ${team}`;

export const STORY_EN: StoryCopy = {
  at: (m) => (m === undefined ? '' : ` in minute ${m}`),
  goal: (scorer, team, at) =>
    scorer === undefined
      ? `${team} scored${at}.`
      : `${scorer} scored for ${team}${at}.`,
  red: (player, team, at) =>
    player === undefined
      ? `${team} had a player sent off${at}.`
      : `${player} of ${team} was sent off${at}.`,
  swing: (team, at) => `Momentum swung towards ${team}${at}.`,
  halfTime: (s) => `It was ${s.home} ${s.h}–${s.a} ${s.away} at half-time.`,
  goallessFirst: 'The first half ended goalless.',
  goallessSecond: 'There were no goals after the break.',
  quietSecond: 'The second half passed without a key moment.',
  decisive: (scorer, team, at) =>
    `The decisive moment came${at}, ${scorer === undefined ? `when ${team} went ahead for good` : `when ${scorer} put ${team} ahead for good`}.`,
  equaliser: (scorer, team, at) =>
    `The last word went to ${by(scorer, team)}, levelling the match${at}.`,
  redTurn: (team, at) =>
    `From the dismissal${at}, ${team} played with a player fewer.`,
  noGoals: 'Neither side found a way through.',
  win: (winner, loser, w, l) => `${winner} beat ${loser} ${w}–${l}.`,
  draw: (s) => `It finished ${s.home} ${s.h}–${s.a} ${s.away}.`,
  shots: (home, [hs, ht], away, [as, at]) =>
    `${home} had ${hs} shots with ${ht} on target; ${away} had ${as} with ${at} on target.`,
  fan: {
    decisive: (scorer, team, at) =>
      `The big one came${at}: ${by(scorer, team)}, and they never looked back.`,
    equaliser: (scorer, team, at) =>
      `All square at the end: ${by(scorer, team)} levelled it${at}.`,
    noGoals: 'Plenty of effort, but no way through for either side.',
    win: (winner, loser, w, l) => `${winner} see off ${loser} ${w}–${l}.`,
    draw: (s) => `Honours even: ${s.home} ${s.h}–${s.a} ${s.away}.`,
  },
};

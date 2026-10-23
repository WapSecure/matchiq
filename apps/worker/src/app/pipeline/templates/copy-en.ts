import { type LocaleCopy, scoreLine } from './copy-types';

const conf = (label: string) => `Confidence: ${label}.`;

export const COPY_EN: LocaleCopy = {
  confidence: { low: 'low', medium: 'medium', high: 'high' },
  headline: {
    GOAL: (f) => `Goal for ${f.team}`,
    RED_CARD: (f) => `Red card for ${f.team}`,
    SHOT_BURST: (f) => `${f.team} turn up the pressure`,
    HIGH_REGAINS: (f) => `${f.team} win the ball high`,
    PRESSURE_SWING: (f) => `${f.team} step up the press`,
    MOMENTUM_SHIFT: (f) => `Momentum swings to ${f.team}`,
    PLAYER_MILESTONE: (f) => `Milestone for ${f.team}`,
  },
  casual: {
    GOAL: (f) =>
      f.player === undefined
        ? `${f.team} score: ${scoreLine(f)}.`
        : `${f.player} scores for ${f.team}: ${scoreLine(f)}.`,
    RED_CARD: (f) =>
      f.player === undefined
        ? `${f.team} have a player sent off.`
        : `${f.player} is sent off for ${f.team}.`,
    SHOT_BURST: (f) =>
      `${f.team} have had ${f.v['shots']} shots in a short spell.`,
    HIGH_REGAINS: (f) =>
      `${f.team} keep winning the ball back high up the pitch, ${f.v['high']} times in a short spell.`,
    PRESSURE_SWING: (f) =>
      `${f.team} are pressing harder, with ${f.v['pressures']} pressures in the latest spell.`,
    MOMENTUM_SHIFT: (f) => `The game is swinging towards ${f.team}.`,
    PLAYER_MILESTONE: (f) => `${f.team} reach a milestone.`,
  },
  analyst: {
    GOAL: (f) =>
      `Rolling-window shots for ${f.team}: ${f.v['shots']}. ${conf(f.confidenceText)}`,
    RED_CARD: (f) =>
      `Dismissals for ${f.team}: ${f.v['redCards']}; yellow cards: ${f.v['yellowCards']}. ${conf(f.confidenceText)}`,
    SHOT_BURST: (f) =>
      `Rolling-window shots: ${f.team} ${f.v['shots']} (${f.v['onTarget']} on target), ${f.opponent} ${f.v['oppShots']}. ${conf(f.confidenceText)}`,
    HIGH_REGAINS: (f) =>
      `Rolling-window high recoveries: ${f.team} ${f.v['high']}, ${f.opponent} ${f.v['oppHigh']}. ${conf(f.confidenceText)}`,
    PRESSURE_SWING: (f) =>
      `Pressures by ${f.team}: ${f.v['pressures']} in the latest window against ${f.v['previous']} in the window before. ${conf(f.confidenceText)}`,
    MOMENTUM_SHIFT: (f) =>
      `Momentum index (descriptive, not a forecast): ${f.team} ${f.v['momentum']}, ${f.opponent} ${f.v['oppMomentum']}. ${conf(f.confidenceText)}`,
    PLAYER_MILESTONE: (f) => conf(f.confidenceText),
  },
  broadcast: {
    GOAL: (f) => scoreLine(f),
    RED_CARD: (f) => `${f.team} lose a player to a red card`,
    SHOT_BURST: (f) => `${f.v['shots']} shots in the latest spell`,
    HIGH_REGAINS: (f) => `${f.v['high']} high recoveries in the latest spell`,
    PRESSURE_SWING: (f) =>
      `${f.v['pressures']} pressures, up from ${f.v['previous']}`,
    MOMENTUM_SHIFT: (f) => `${f.team} are on top`,
    PLAYER_MILESTONE: () => 'Milestone reached',
  },
  generic: {
    headline: (f) => `Key moment for ${f.team}`,
    body: (f) => `The match engine flagged a key moment for ${f.team}.`,
  },
};

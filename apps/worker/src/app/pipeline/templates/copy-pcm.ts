import { type LocaleCopy, scoreLine } from './copy-types';

/**
 * Nigerian Pidgin (Naijá) copy in the BBC Pidgin spelling ("di", "dey", "don").
 * Football terms stay in English as fans say them; see
 * docs/localization/PIDGIN_GLOSSARY.md (pending native-speaker review).
 */
const conf = (label: string) => `Confidence na ${label}.`;

export const COPY_PCM: LocaleCopy = {
  confidence: { low: 'low', medium: 'medium', high: 'high' },
  headline: {
    GOAL: (f) => `Goal! ${f.team} don score`,
    RED_CARD: (f) => `Red card for ${f.team}`,
    SHOT_BURST: (f) => `${f.team} dey fire shots`,
    HIGH_REGAINS: (f) => `${f.team} dey win ball for up`,
    PRESSURE_SWING: (f) => `${f.team} dey press well well`,
    MOMENTUM_SHIFT: (f) => `Momentum don shift go ${f.team} side`,
    PLAYER_MILESTONE: (f) => `${f.team} don reach milestone`,
  },
  casual: {
    GOAL: (f) =>
      f.player === undefined
        ? `${f.team} don score, na ${scoreLine(f)} now.`
        : `${f.player} don score for ${f.team}, na ${scoreLine(f)} now.`,
    RED_CARD: (f) =>
      f.player === undefined
        ? `${f.team} don lose one player to red card.`
        : `${f.player} don collect red card for ${f.team}.`,
    SHOT_BURST: (f) =>
      `${f.team} don fire ${f.v['shots']} shots inside short time.`,
    HIGH_REGAINS: (f) =>
      `${f.team} dey win ball back for up, ${f.v['high']} times inside short time.`,
    PRESSURE_SWING: (f) =>
      `${f.team} dey press well well, ${f.v['pressures']} pressures for di latest spell.`,
    MOMENTUM_SHIFT: (f) => `Di game don dey turn for ${f.team} side.`,
    PLAYER_MILESTONE: (f) => `${f.team} don reach one milestone.`,
  },
  analyst: {
    GOAL: (f) =>
      `${f.team} shots for di rolling window: ${f.v['shots']}. ${conf(f.confidenceText)}`,
    RED_CARD: (f) =>
      `Red cards for ${f.team}: ${f.v['redCards']}; yellow cards: ${f.v['yellowCards']}. ${conf(f.confidenceText)}`,
    SHOT_BURST: (f) =>
      `Shots for di rolling window: ${f.team} ${f.v['shots']} (${f.v['onTarget']} on target), ${f.opponent} ${f.v['oppShots']}. ${conf(f.confidenceText)}`,
    HIGH_REGAINS: (f) =>
      `High recoveries for di rolling window: ${f.team} ${f.v['high']}, ${f.opponent} ${f.v['oppHigh']}. ${conf(f.confidenceText)}`,
    PRESSURE_SWING: (f) =>
      `${f.team} pressures: ${f.v['pressures']} for di latest window, ${f.v['previous']} for di one before am. ${conf(f.confidenceText)}`,
    MOMENTUM_SHIFT: (f) =>
      `Momentum index (e dey describe wetin don happen, e no be prediction): ${f.team} ${f.v['momentum']}, ${f.opponent} ${f.v['oppMomentum']}. ${conf(f.confidenceText)}`,
    PLAYER_MILESTONE: (f) => conf(f.confidenceText),
  },
  broadcast: {
    GOAL: (f) => scoreLine(f),
    RED_CARD: (f) => `${f.team} don lose one player to red card`,
    SHOT_BURST: (f) => `${f.v['shots']} shots for di latest spell`,
    HIGH_REGAINS: (f) => `${f.v['high']} high recoveries for di latest spell`,
    PRESSURE_SWING: (f) =>
      `${f.v['pressures']} pressures, e don climb from ${f.v['previous']}`,
    MOMENTUM_SHIFT: (f) => `${f.team} dey on top`,
    PLAYER_MILESTONE: () => 'Milestone don land',
  },
  generic: {
    headline: (f) => `Big moment for ${f.team}`,
    body: (f) => `Di match engine don flag one big moment for ${f.team}.`,
  },
};

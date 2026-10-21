import { type LocaleCopy, scoreLine } from './copy-types';

const conf = (label: string) => `Confiance : ${label}.`;

export const COPY_FR: LocaleCopy = {
  confidence: { low: 'faible', medium: 'moyenne', high: 'élevée' },
  headline: {
    GOAL: (f) => `But pour ${f.team}`,
    RED_CARD: (f) => `Carton rouge pour ${f.team}`,
    SHOT_BURST: (f) => `${f.team} accentue la pression`,
    HIGH_REGAINS: (f) => `${f.team} récupère haut`,
    PRESSURE_SWING: (f) => `${f.team} presse plus fort`,
    MOMENTUM_SHIFT: (f) => `La dynamique passe à ${f.team}`,
    PLAYER_MILESTONE: (f) => `Cap franchi pour ${f.team}`,
  },
  casual: {
    GOAL: (f) =>
      f.player === undefined
        ? `${f.team} marque : ${scoreLine(f)}.`
        : `${f.player} marque pour ${f.team} : ${scoreLine(f)}.`,
    RED_CARD: (f) =>
      f.player === undefined
        ? `${f.team} perd un joueur sur carton rouge.`
        : `${f.player} est expulsé côté ${f.team}.`,
    SHOT_BURST: (f) =>
      `${f.team} enchaîne ${f.v['shots']} tirs en peu de temps.`,
    HIGH_REGAINS: (f) =>
      `${f.team} récupère le ballon haut, ${f.v['high']} fois en peu de temps.`,
    PRESSURE_SWING: (f) =>
      `${f.team} presse davantage, avec ${f.v['pressures']} pressions sur la dernière période.`,
    MOMENTUM_SHIFT: (f) => `Le match bascule en faveur de ${f.team}.`,
    PLAYER_MILESTONE: (f) => `${f.team} franchit un cap.`,
  },
  analyst: {
    GOAL: (f) =>
      `Tirs de ${f.team} sur la fenêtre glissante : ${f.v['shots']}. ${conf(f.confidenceText)}`,
    RED_CARD: (f) =>
      `Exclusions pour ${f.team} : ${f.v['redCards']} ; cartons jaunes : ${f.v['yellowCards']}. ${conf(f.confidenceText)}`,
    SHOT_BURST: (f) =>
      `Tirs sur la fenêtre glissante : ${f.team} ${f.v['shots']} (${f.v['onTarget']} cadrés), ${f.opponent} ${f.v['oppShots']}. ${conf(f.confidenceText)}`,
    HIGH_REGAINS: (f) =>
      `Récupérations hautes sur la fenêtre glissante : ${f.team} ${f.v['high']}, ${f.opponent} ${f.v['oppHigh']}. ${conf(f.confidenceText)}`,
    PRESSURE_SWING: (f) =>
      `Pressions de ${f.team} : ${f.v['pressures']} sur la dernière fenêtre contre ${f.v['previous']} sur la précédente. ${conf(f.confidenceText)}`,
    MOMENTUM_SHIFT: (f) =>
      `Indice de dynamique (descriptif, pas une prévision) : ${f.team} ${f.v['momentum']}, ${f.opponent} ${f.v['oppMomentum']}. ${conf(f.confidenceText)}`,
    PLAYER_MILESTONE: (f) => conf(f.confidenceText),
  },
  broadcast: {
    GOAL: (f) => scoreLine(f),
    RED_CARD: (f) => `${f.team} perd un joueur sur carton rouge`,
    SHOT_BURST: (f) => `${f.v['shots']} tirs sur la dernière période`,
    HIGH_REGAINS: (f) => `${f.v['high']} récupérations hautes récentes`,
    PRESSURE_SWING: (f) =>
      `${f.v['pressures']} pressions, contre ${f.v['previous']} avant`,
    MOMENTUM_SHIFT: (f) =>
      `Indice de dynamique ${f.v['momentum']} contre ${f.v['oppMomentum']}`,
    PLAYER_MILESTONE: () => 'Cap franchi',
  },
  generic: {
    headline: (f) => `Moment clé pour ${f.team}`,
    body: (f) => `Le moteur de match signale un moment clé pour ${f.team}.`,
  },
};

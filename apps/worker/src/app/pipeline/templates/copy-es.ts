import { type LocaleCopy, scoreLine } from './copy-types';

const conf = (label: string) => `Confianza: ${label}.`;

export const COPY_ES: LocaleCopy = {
  confidence: { low: 'baja', medium: 'media', high: 'alta' },
  headline: {
    GOAL: (f) => `Gol de ${f.team}`,
    RED_CARD: (f) => `Tarjeta roja para ${f.team}`,
    SHOT_BURST: (f) => `${f.team} aprieta en ataque`,
    HIGH_REGAINS: (f) => `${f.team} recupera arriba`,
    PRESSURE_SWING: (f) => `${f.team} intensifica la presión`,
    MOMENTUM_SHIFT: (f) => `El impulso cambia hacia ${f.team}`,
    PLAYER_MILESTONE: (f) => `Hito para ${f.team}`,
  },
  casual: {
    GOAL: (f) =>
      f.player === undefined
        ? `${f.team} marca: ${scoreLine(f)}.`
        : `${f.player} marca para ${f.team}: ${scoreLine(f)}.`,
    RED_CARD: (f) =>
      f.player === undefined
        ? `${f.team} pierde a un jugador por tarjeta roja.`
        : `${f.player} es expulsado en ${f.team}.`,
    SHOT_BURST: (f) => `${f.team} suma ${f.v['shots']} tiros en poco tiempo.`,
    HIGH_REGAINS: (f) =>
      `${f.team} recupera el balón arriba, ${f.v['high']} veces en poco tiempo.`,
    PRESSURE_SWING: (f) =>
      `${f.team} presiona más, con ${f.v['pressures']} presiones en el último tramo.`,
    MOMENTUM_SHIFT: (f) => `El partido se inclina hacia ${f.team}.`,
    PLAYER_MILESTONE: (f) => `${f.team} alcanza un hito.`,
  },
  analyst: {
    GOAL: (f) =>
      `Tiros de ${f.team} en la ventana móvil: ${f.v['shots']}. ${conf(f.confidenceText)}`,
    RED_CARD: (f) =>
      `Expulsiones de ${f.team}: ${f.v['redCards']}; amarillas: ${f.v['yellowCards']}. ${conf(f.confidenceText)}`,
    SHOT_BURST: (f) =>
      `Tiros en la ventana móvil: ${f.team} ${f.v['shots']} (${f.v['onTarget']} a puerta), ${f.opponent} ${f.v['oppShots']}. ${conf(f.confidenceText)}`,
    HIGH_REGAINS: (f) =>
      `Recuperaciones altas en la ventana móvil: ${f.team} ${f.v['high']}, ${f.opponent} ${f.v['oppHigh']}. ${conf(f.confidenceText)}`,
    PRESSURE_SWING: (f) =>
      `Presiones de ${f.team}: ${f.v['pressures']} en la última ventana frente a ${f.v['previous']} en la anterior. ${conf(f.confidenceText)}`,
    MOMENTUM_SHIFT: (f) =>
      `Índice de impulso (descriptivo, no una predicción): ${f.team} ${f.v['momentum']}, ${f.opponent} ${f.v['oppMomentum']}. ${conf(f.confidenceText)}`,
    PLAYER_MILESTONE: (f) => conf(f.confidenceText),
  },
  broadcast: {
    GOAL: (f) => scoreLine(f),
    RED_CARD: (f) => `${f.team} pierde a un jugador por roja`,
    SHOT_BURST: (f) => `${f.v['shots']} tiros en el último tramo`,
    HIGH_REGAINS: (f) => `${f.v['high']} recuperaciones altas recientes`,
    PRESSURE_SWING: (f) =>
      `${f.v['pressures']} presiones, frente a ${f.v['previous']} antes`,
    MOMENTUM_SHIFT: (f) =>
      `Índice de impulso ${f.v['momentum']} frente a ${f.v['oppMomentum']}`,
    PLAYER_MILESTONE: () => 'Hito alcanzado',
  },
  generic: {
    headline: (f) => `Momento clave para ${f.team}`,
    body: (f) => `El motor del partido señala un momento clave para ${f.team}.`,
  },
};

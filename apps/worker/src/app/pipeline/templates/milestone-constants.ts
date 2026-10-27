import type { Locale } from '@matchiq/contracts';

/** Milestone metric base names the engine emits (`<base>.<side>`). */
export const MILESTONE_METRICS = [
  'shotsOnTarget',
  'goals',
  'yellowCards',
] as const;

export type MilestoneMetric = (typeof MILESTONE_METRICS)[number];

export const MILESTONE_FACT_KEY = 'milestone';

export const HEADLINE_MAX = 60;

interface Noun {
  readonly one: string;
  readonly other: string;
}

interface MilestonePhrases {
  readonly nouns: Readonly<Record<MilestoneMetric, Noun>>;
  readonly headline: (team: string, amount: string) => string;
  readonly body: (amount: string) => string;
  readonly casual: (team: string, amount: string) => string;
}

export const MILESTONE_PHRASES: Readonly<Record<Locale, MilestonePhrases>> = {
  'en-GB': {
    nouns: {
      shotsOnTarget: { one: 'shot on target', other: 'shots on target' },
      goals: { one: 'goal', other: 'goals' },
      yellowCards: { one: 'yellow card', other: 'yellow cards' },
    },
    headline: (team, amount) => `${team} reach ${amount}`,
    body: (amount) => `${amount} so far`,
    casual: (team, amount) => `${team} have ${amount} so far.`,
  },
  'fr-FR': {
    nouns: {
      shotsOnTarget: { one: 'tir cadré', other: 'tirs cadrés' },
      goals: { one: 'but', other: 'buts' },
      yellowCards: { one: 'carton jaune', other: 'cartons jaunes' },
    },
    headline: (team, amount) => `${team} : ${amount}`,
    body: (amount) => `${amount} jusqu'ici`,
    casual: (team, amount) => `${team} compte ${amount} jusqu'ici.`,
  },
  'es-ES': {
    nouns: {
      shotsOnTarget: { one: 'tiro a puerta', other: 'tiros a puerta' },
      goals: { one: 'gol', other: 'goles' },
      yellowCards: { one: 'tarjeta amarilla', other: 'tarjetas amarillas' },
    },
    headline: (team, amount) => `${team}: ${amount}`,
    body: (amount) => `${amount} hasta ahora`,
    casual: (team, amount) => `${team} suma ${amount} hasta ahora.`,
  },
  'pcm-NG': {
    nouns: {
      shotsOnTarget: { one: 'shot on target', other: 'shots on target' },
      goals: { one: 'goal', other: 'goals' },
      yellowCards: { one: 'yellow card', other: 'yellow cards' },
    },
    headline: (team, amount) => `${team} don reach ${amount}`,
    body: (amount) => `${amount} so far`,
    casual: (team, amount) => `${team} don get ${amount} so far.`,
  },
};

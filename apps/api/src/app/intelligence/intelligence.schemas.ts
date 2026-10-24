import { CursorPageQuery, Locale, Persona } from '@matchiq/contracts';
import { z } from 'zod';
import { API_LIMITS } from '../constants';

export const MatchListQuery = CursorPageQuery(
  API_LIMITS.matchListDefault,
  API_LIMITS.matchListMax,
);

export const NarrativeQuery = MatchListQuery.extend({
  persona: Persona.optional(),
  locale: Locale.optional(),
});

export type MatchListQuery = z.infer<typeof MatchListQuery>;
export type NarrativeQuery = z.infer<typeof NarrativeQuery>;

export const RecapQuery = z.strictObject({
  persona: Persona.optional(),
  lang: Locale.optional(),
});

export type RecapQuery = z.infer<typeof RecapQuery>;

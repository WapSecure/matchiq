import { Locale, Persona } from '@matchiq/contracts';
import { z } from 'zod';

export const NarrativeQuery = z.strictObject({
  persona: Persona.optional(),
  locale: Locale.optional(),
});

export type NarrativeQuery = z.infer<typeof NarrativeQuery>;

import type { Persona } from '@matchiq/contracts';

/** Standard wording is labelled for analysts only; fan and broadcast views stay clean. */
export const showSource = (source: string, persona: Persona) =>
  source === 'AGENT' || persona === 'ANALYST';

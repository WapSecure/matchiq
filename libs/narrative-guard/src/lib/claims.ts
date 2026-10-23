import type { GuardFinding } from './findings.js';
import { FORBIDDEN_LEXICON, type ForbiddenCategory } from './lexicon.js';
import { compileLexicon } from './text.js';

const FORBIDDEN = compileLexicon(FORBIDDEN_LEXICON);
const INJECTION: ForbiddenCategory = 'injection';

/**
 * Claims the evidence envelope can never support (medical, betting,
 * prediction, managerial intent) and echoes of injected instructions, prompt
 * text, links or markup. One finding per category, first match as excerpt.
 */
export const claimFindings = (text: string): GuardFinding[] => {
  const seen = new Map<ForbiddenCategory, string>();
  for (const { category, regex } of FORBIDDEN) {
    if (seen.has(category)) continue;
    const match = regex.exec(text);
    if (match !== null) seen.set(category, match[0]);
  }
  return [...seen].map(([category, excerpt]) => ({
    rule: category === INJECTION ? 'INJECTION_ECHO' : 'FORBIDDEN_CLAIM',
    reason: category,
    excerpt,
  }));
};

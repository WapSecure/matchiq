/**
 * The controlled vocabulary shared by the worker publish gate and the agents
 * service's Fact Checker. This file is the only source: `export-lexicon`
 * writes it to JSON and `agents:codegen` copies that into the Python package,
 * so both guards load the same patterns (CI fails on drift).
 *
 * Patterns use the syntax both engines share. Each is matched
 * case-insensitively between word boundaries, and `\w` means any Unicode
 * letter, mark, digit or underscore in both.
 */
export const FORBIDDEN_LEXICON = {
  medical: [
    String.raw`injur\w*`,
    String.raw`fatigue\w*`,
    'tired',
    String.raw`exhaust\w*`,
    'hamstring',
    'bless(?:é|ée|és|ées|ure|ures)',
    String.raw`lesi[oó]n\w*`,
    String.raw`cansad\w*`,
    String.raw`fatigu[ée]\w*`,
    String.raw`agotad\w*`,
    String.raw`don\s+wound`,
    String.raw`(?:don|dey)\s+tire`,
    String.raw`(?:leg|body|knee)\s+dey\s+pain`,
  ],
  betting: [
    'bet(?:s|ting)?',
    'odds',
    String.raw`wager\w*`,
    String.raw`bookmaker\w*`,
    String.raw`pari(?:s)?\s+sportifs?`,
    'cotes?',
    'apuestas?',
    'cuotas?',
    String.raw`stak(?:e|ing)\s+(?:money|am|una|your)`,
    String.raw`booking\s+codes?`,
    String.raw`sure\s+banker`,
  ],
  prediction: [
    String.raw`win\s+probability`,
    String.raw`(?:is|are)\s+(?:certain|sure|guaranteed)\s+to\s+win`,
    String.raw`will\s+(?:win|lose)`,
    String.raw`probabilit[ée]\s+de\s+victoire`,
    String.raw`va\s+gagner`,
    String.raw`probabilidad\s+de\s+victoria`,
    String.raw`va\s+a\s+ganar`,
    String.raw`go\s+(?:win|lose)(?!\s+(?:di\s+|the\s+)?(?:ball|possession))`,
    String.raw`(?:don\s+)?sure\s+say\s+(?:dem|e|una)\s+go\s+win`,
  ],
  managerial_intent: [
    String.raw`(?:manager|coach|boss)\s+(?:has\s+)?(?:changed|switched|ordered)\w*`,
    String.raw`tactical\s+(?:switch|change)\s+(?:by|from)\s+the\s+(?:manager|coach)`,
    String.raw`(?:entra[iî]neur|coach)\s+a\s+chang[ée]`,
    String.raw`(?:entrenador|t[ée]cnico)\s+(?:ha\s+)?cambi[oó]`,
    String.raw`(?:manager|coach|oga)\s+(?:don\s+)?(?:change|switch|order)\w*`,
  ],
  injection: [
    String.raw`ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?`,
    String.raw`disregard\s+(?:all\s+)?(?:previous|prior|above)`,
    String.raw`system\s+prompt`,
    String.raw`you\s+are\s+now`,
    String.raw`new\s+instructions?`,
    String.raw`developer\s+mode`,
    String.raw`forget\s+(?:all\s+)?(?:di|the|una)\s+(?:previous\s+)?(?:instructions?|rules?)`,
    String.raw`(?:forget|ignore)\s+wetin\s+dem\s+(?:tell|talk\s+to)\s+you`,
    String.raw`ignore[sz]?\s+(?:toutes\s+)?(?:les\s+)?instructions`,
    String.raw`oublie[sz]?\s+(?:toutes\s+)?(?:les\s+)?instructions`,
    String.raw`ignora\s+(?:todas\s+)?(?:las\s+)?instrucciones`,
    String.raw`olvida\s+(?:todas\s+)?(?:las\s+)?instrucciones`,
    String.raw`(?:my|your|the)\s+(?:system\s+)?instructions\s+(?:are|say|tell)`,
    String.raw`as\s+an\s+ai(?:\s+(?:language\s+)?model)?`,
    String.raw`language\s+model`,
    String.raw`MATCHIQ_DATA_(?:BEGIN|END)`,
    String.raw`https?://\S+`,
    String.raw`www\.\S+`,
    // Markup can touch words ("a<b>c"), so these absorb the neighbouring word.
    String.raw`\w*<\s*/?\s*[a-z][^>]*>\w*`,
    String.raw`\w*\[[^\]]*\]\([^)]*\)\w*`,
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/**
 * Broadcast-safety blocklist: profanity, slurs, and abuse aimed at players,
 * teams or officials. Deliberately narrow; subtler toxicity is left to a
 * hosted classifier when one is configured.
 */
export const SAFETY_LEXICON = {
  profanity: [
    String.raw`fuck\w*`,
    String.raw`shit\w*`,
    'bullshit',
    String.raw`bastard\w*`,
    String.raw`wank\w*`,
    String.raw`twat\w*`,
    'crap',
    'piss(?:ed)?',
    'arse(?:hole)?s?',
    'bollocks',
    'merde',
    'putain',
    String.raw`connard\w*`,
    'mierda',
    'joder',
    String.raw`cabr[oó]n\w*`,
    'gilipollas',
    String.raw`pendejo\w*`,
    String.raw`hijo\s+de\s+puta`,
  ],
  slur: [
    String.raw`retard\w*`,
    'spastic',
    'spaz',
    String.raw`fagg?ot\w*`,
    String.raw`n[i1]gg(?:er|a)s?`,
    'pakis?',
    'trann(?:y|ies)',
    String.raw`maric[oó]n\w*`,
    'p[ée]d[ée]s?',
    'sudacas?',
  ],
  abuse: [
    String.raw`idiot\w*`,
    String.raw`stupid\w*`,
    String.raw`moron\w*`,
    'clowns?',
    'pathetic',
    String.raw`disgrace\w*`,
    'useless',
    'rubbish',
    'garbage',
    'trash',
    'shambolic',
    'cowards?',
    'lazy',
    String.raw`minable\w*`,
    String.raw`inútil\w*`,
    String.raw`est[úu]pid\w*`,
    'basura',
    'vergüenza',
    'mumu',
    'olodo',
    'werey',
    'ode',
    'yeye',
    'ashawo',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type ForbiddenCategory = keyof typeof FORBIDDEN_LEXICON;
export type SafetyCategory = keyof typeof SAFETY_LEXICON;

export const LEXICON_SCHEMA_VERSION = 1;
export const LEXICON_FILE_NAME = 'narrative-lexicon.json';

/** The JSON both guards load; stable key order so the generated file diffs cleanly. */
export const serializeLexicon = (): string =>
  `${JSON.stringify(
    {
      schemaVersion: LEXICON_SCHEMA_VERSION,
      forbidden: FORBIDDEN_LEXICON,
      safety: SAFETY_LEXICON,
    },
    null,
    2,
  )}\n`;

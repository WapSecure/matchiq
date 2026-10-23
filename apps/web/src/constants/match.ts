import type {
  ConfidenceLabel,
  FixtureStatus,
  InsightKind,
  InsightPriority,
  Locale,
  MatchEventType,
  MatchPhase,
  MetricUnavailableReason,
  OverlayKind,
  Persona,
  PossessionBasis,
} from '@matchiq/contracts';

export const DEFAULT_COMMENTARY_LOCALE: Locale = 'en-GB';

export const EVENT_LABELS: Record<MatchEventType, string> = {
  MATCH_STARTED: 'Kick-off',
  PERIOD_STARTED: 'Period started',
  PERIOD_ENDED: 'Period ended',
  MATCH_ENDED: 'Full time',
  PASS_ATTEMPTED: 'Pass attempted',
  PASS_COMPLETED: 'Pass completed',
  PASS_INTERCEPTED: 'Pass intercepted',
  CARRY: 'Run with the ball',
  FINAL_THIRD_ENTRY: 'Final third entry',
  TACKLE: 'Tackle',
  PRESSURE_APPLIED: 'Pressure',
  RECOVERY: 'Ball recovery',
  POSSESSION_CHANGED: 'Change of possession',
  SHOT: 'Shot',
  GOAL: 'Goal',
  SAVE: 'Save',
  FOUL: 'Foul',
  CARD: 'Card',
  SUBSTITUTION: 'Substitution',
  PLAYER_POSITION: 'Player position',
  BALL_POSITION: 'Ball position',
  CORRECTION: 'Correction',
};

/** Shown in the ticker; the rest stay in the evidence trail only. */
export const KEY_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set([
  'MATCH_STARTED',
  'PERIOD_STARTED',
  'PERIOD_ENDED',
  'MATCH_ENDED',
  'SHOT',
  'GOAL',
  'SAVE',
  'FOUL',
  'CARD',
  'SUBSTITUTION',
  'TACKLE',
  'RECOVERY',
  'FINAL_THIRD_ENTRY',
  'PASS_INTERCEPTED',
  'CORRECTION',
]);

/** The timeline's default view: what changes a match, without the build-up. */
export const HEADLINE_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set([
  'MATCH_STARTED',
  'PERIOD_STARTED',
  'PERIOD_ENDED',
  'MATCH_ENDED',
  'SHOT',
  'GOAL',
  'SAVE',
  'CARD',
  'SUBSTITUTION',
  'CORRECTION',
]);

export const HIGHLIGHT_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set([
  'GOAL',
  'CARD',
  'CORRECTION',
]);

export const INSIGHT_KIND_LABELS: Record<InsightKind, string> = {
  GOAL: 'Goal',
  RED_CARD: 'Red card',
  SHOT_BURST: 'Shot burst',
  HIGH_REGAINS: 'High regains',
  PRESSURE_SWING: 'Pressure swing',
  MOMENTUM_SHIFT: 'Momentum shift',
  PLAYER_MILESTONE: 'Player milestone',
};

export const PRIORITY_LABELS: Record<InsightPriority, string> = {
  P0: 'Major',
  P1: 'Notable',
  P2: 'Context',
};

export const CONFIDENCE_LABELS: Record<ConfidenceLabel, string> = {
  low: 'Limited evidence',
  medium: 'Moderate evidence',
  high: 'Strong evidence',
};

export const PERSONA_OPTIONS: readonly { value: Persona; label: string }[] = [
  { value: 'CASUAL', label: 'Fan' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'BROADCAST', label: 'Broadcast' },
];

/** Personas inside a sentence: "Write-up for fans". */
export const PERSONA_LABELS: Record<Persona, string> = {
  CASUAL: 'fans',
  ANALYST: 'analysts',
  BROADCAST: 'broadcast',
};

export const LOCALE_OPTIONS: readonly {
  value: Locale;
  label: string;
  short: string;
  lang: Locale;
}[] = [
  { value: 'en-GB', lang: 'en-GB', label: 'English', short: 'EN' },
  { value: 'fr-FR', lang: 'fr-FR', label: 'Français', short: 'FR' },
  { value: 'es-ES', lang: 'es-ES', label: 'Español', short: 'ES' },
  { value: 'pcm-NG', lang: 'pcm-NG', label: 'Naijá (Pidgin)', short: 'PCM' },
];

/** A locale code as its language's own name; unknown codes are shown as given. */
export const languageName = (locale: string): string =>
  LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? locale;

/** Language names in English, for English interface sentences. */
const ENGLISH_LANGUAGE_NAMES: Record<string, string> = {
  'en-GB': 'English',
  'fr-FR': 'French',
  'es-ES': 'Spanish',
  'pcm-NG': 'Nigerian Pidgin',
};

export const englishLanguageName = (locale: string): string =>
  ENGLISH_LANGUAGE_NAMES[locale] ?? languageName(locale);

export const UNAVAILABLE_REASONS: Record<MetricUnavailableReason, string> = {
  ZERO_DENOMINATOR: 'No attempts yet',
  NO_TRACKING_DATA: 'Not tracked in this match',
  NOT_GENERATED: 'Not recorded in this match',
  INSUFFICIENT_SAMPLE: 'Too early to tell',
};

export const POSSESSION_BASIS_LABELS: Record<PossessionBasis, string> = {
  TIME_WEIGHTED: 'By time on the ball',
  EVENT_SHARE_PROXY: 'Estimated from events',
};

export const FIXTURE_STATUS_LABELS: Record<FixtureStatus, string> = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  COMPLETED: 'Completed',
  ABANDONED: 'Abandoned',
};

export const PHASE_LABELS: Record<MatchPhase, string> = {
  NOT_STARTED: 'Pre-match',
  IN_PLAY: 'In play',
  BREAK: 'Break',
  COMPLETED: 'Full time',
};

export const PERIOD_LABELS: Record<number, string> = {
  1: '1st half',
  2: '2nd half',
  3: 'Extra time 1',
  4: 'Extra time 2',
  5: 'Penalties',
};

export const OVERLAY_KIND_LABELS: Record<OverlayKind, string> = {
  SCORE_UPDATE: 'Score update',
  KEY_MOMENT: 'Key moment',
  TACTICAL_INSIGHT: 'Tactical insight',
  STAT_COMPARISON: 'Stat comparison',
  DISCIPLINE: 'Discipline',
  SUBSTITUTION: 'Substitution',
};

export const NOT_AVAILABLE = 'Not available';

export const SIDE_LABELS = { home: 'Home', away: 'Away' } as const;

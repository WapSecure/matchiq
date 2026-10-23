/** Typed reasons; the worker gate records each as a `GateIssueCode`. */
export type GuardRule =
  | 'FORBIDDEN_CLAIM'
  | 'INJECTION_ECHO'
  | 'UNSUPPORTED_CAUSALITY'
  | 'REPETITION'
  | 'UNSAFE_TONE';

export type ToneReason =
  'profanity' | 'slur' | 'abuse' | 'shouting' | 'exclamation';
export type RepetitionReason = 'recent_narrative' | 'repeated_phrase';

export interface GuardFinding {
  readonly rule: GuardRule;
  /** The lexicon category or sub-rule that fired. */
  readonly reason: string;
  /** The matched text, for the fact-check record. */
  readonly excerpt: string;
}

/** Plain-language labels for the publish gate's independent guard checks (`GateIssueCode`). */
export const GUARD_ISSUE_LABELS: Record<string, string> = {
  INJECTION_ECHO: 'Text that looked like instructions, a link or code',
  UNSUPPORTED_CAUSALITY: "A reason given that the match data doesn't show",
  REPETITION: 'Wording that repeated what we said recently',
  UNSAFE_TONE: "A tone that isn't right for broadcast",
};

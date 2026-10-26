export const SHORTCUTS_STORAGE_KEY = 'matchiq.approval-shortcuts';

export const SETTLED_VISIBLE_MS = 8_000;

export const SHORTCUT_KEYS = {
  approve: ['a'],
  approveOnItem: ['enter'],
  reject: ['d'],
  next: ['j'],
  previous: ['k'],
  nextItem: ['arrowdown'],
  previousItem: ['arrowup'],
  help: ['?'],
} as const;

export const SHORTCUTS_COPY = {
  switchLabel: 'Keyboard shortcuts',
  helpButton: 'Shortcuts',
  helpTitle: 'Keyboard shortcuts',
  helpIntro:
    'These work when a waiting graphic or one of its buttons has focus. Turn them off with the switch.',
  rows: [
    { keys: ['A', 'Enter'], label: 'Send the focused graphic to air' },
    { keys: ['D'], label: "Don't air the focused graphic" },
    { keys: ['J', '↓'], label: 'Move to the next waiting graphic' },
    { keys: ['K', '↑'], label: 'Move to the previous waiting graphic' },
    { keys: ['?'], label: 'Show this list' },
  ],
  itemLabel: (headline: string) => `Waiting graphic: ${headline}`,
  approveDescription: 'Shortcut: A, or Enter when the graphic has focus.',
  rejectDescription: 'Shortcut: D.',
} as const;

export const SETTLED_COPY = {
  APPROVED: (time: string) => `Sent to air at ${time}`,
  REJECTED: (time: string) => `Kept off air at ${time}`,
  LAPSED: 'Time ran out, so it stayed off air',
  lapsedDetail: "Nobody sent it in time, so it won't air.",
  region: 'Latest decisions',
} as const;

export type SettledOutcome = 'APPROVED' | 'REJECTED' | 'LAPSED';

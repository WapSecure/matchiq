/** Every way a request can fail, as the user experiences it (CONTENT_STYLE_GUIDE §5). */
export type ErrorKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'sessionExpired'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'invalid'
  | 'rateLimited'
  | 'unavailable'
  | 'server'
  | 'unexpected';

/** The one recovery a message offers; `wait` counts down before allowing a retry. */
export type RecoveryAction =
  'retry' | 'signIn' | 'lobby' | 'wait' | 'reload' | 'none';

export type ErrorCopy = {
  title: string;
  message: string;
  action: RecoveryAction;
  /** Offer the support reference with a "contact support" line. */
  support?: boolean;
};

export const ERROR_COPY: Record<ErrorKind, ErrorCopy> = {
  offline: {
    title: "You're offline",
    message:
      "Check your internet connection. We'll pick up where you left off when you're back.",
    action: 'retry',
  },
  network: {
    title: "We can't reach MatchIQ right now",
    message:
      'This is usually a brief connection problem. Try again in a moment.',
    action: 'retry',
  },
  timeout: {
    title: 'This is taking longer than usual',
    message: "MatchIQ didn't respond in time. Try again.",
    action: 'retry',
  },
  sessionExpired: {
    title: "You've been signed out for security",
    message: 'Sign in again to carry on where you left off.',
    action: 'signIn',
  },
  forbidden: {
    title: "You don't have access to this",
    message:
      "Your role doesn't include this. Ask your organisation owner if you need it.",
    action: 'lobby',
  },
  notFound: {
    title: "We couldn't find that",
    message: 'It may have ended or been removed.',
    action: 'lobby',
  },
  conflict: {
    title: 'That has already changed',
    message:
      'Something changed while you were working. Try again to see the latest.',
    action: 'retry',
  },
  invalid: {
    title: "That didn't go through",
    message:
      "We couldn't accept that request. Try again, and contact support if it keeps happening.",
    action: 'retry',
    support: true,
  },
  rateLimited: {
    title: "You're going a little fast",
    message: 'Please wait a moment before trying again.',
    action: 'wait',
  },
  unavailable: {
    title: 'MatchIQ is busy right now',
    message: "We're at capacity. Please try again shortly.",
    action: 'wait',
  },
  server: {
    title: 'Something went wrong on our side',
    message:
      "It's not you. Try again, and contact support if it keeps happening.",
    action: 'retry',
    support: true,
  },
  unexpected: {
    title: 'Something went wrong',
    message: 'Try again. If it keeps happening, contact support.',
    action: 'retry',
    support: true,
  },
};

export const ERROR_UI = {
  retry: 'Try again',
  retryIn: (seconds: number) => `Try again in ${seconds} s`,
  waitFor: (seconds: number) => `Please wait ${seconds} s`,
  signIn: 'Sign in again',
  lobby: 'Go to matches',
  reload: 'Reload page',
  support: 'Contact support and quote this reference.',
  reference: 'Reference',
  copy: 'Copy reference',
  copied: 'Copied',
  /** Used when the API gives no `Retry-After`. */
  defaultWaitSeconds: 30,
} as const;

export const BOUNDARY_COPY = {
  title: (region: string) => `${region} couldn't load`,
  message: 'The rest of the page still works. Try again to reload this part.',
  retry: 'Try again',
} as const;

export const PAGE_ERROR_COPY = {
  metaTitle: 'Something went wrong',
  eyebrow: 'Something went wrong',
  title: "This page didn't load properly",
  description:
    "It's not you. Try again, or head back to the list of matches. If it keeps happening, contact support and quote the reference below.",
  retry: 'Try again',
  lobby: 'Go to matches',
} as const;

/** Region names for error boundaries, as users know each part of the page. */
export const REGION_NAMES = {
  scoreboard: 'The scoreboard',
  preview: 'The on-air preview',
  pitch: 'The pitch map',
  moments: 'Key moments',
  events: 'Match events',
  stats: 'Match stats',
  controls: 'Producer controls',
  evidence: 'The evidence panel',
  matches: 'The list of matches',
  replays: 'Recent replays',
  recap: 'The recap',
  checks: 'The fact-checks',
  activity: 'The activity log',
} as const;

/** Never shown to users; the guard test scans copy and rendered states for these. */
export const FORBIDDEN_COPY_PATTERNS: readonly RegExp[] = [
  /urn:/i,
  /\bError:/,
  /\bfetch\b/i,
  /\bundefined\b/,
  /\bnull\b/,
  /\bat \S+ \(.*:\d+:\d+\)/,
  /\bHTTP\b/,
  /\b[45]\d\d\b/,
  /\bZod\b/i,
  /\bstack\b/i,
  /\bexception\b/i,
];

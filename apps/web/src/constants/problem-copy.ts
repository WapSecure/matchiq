import type { ErrorCopy, ErrorKind } from './errors';

/**
 * Copy for each `urn:matchiq:problem:*` slug the API, auth guards and BFF can
 * return (docs/api/openapi.json). Generic slugs fall back to `ERROR_COPY`.
 */
export const PROBLEM_COPY: Record<string, ErrorCopy | ErrorKind> = {
  'bad-request': 'invalid',
  'validation-failed': 'invalid',
  'invalid-header': 'invalid',
  'fixture-mismatch': 'invalid',
  unauthorized: 'sessionExpired',
  forbidden: 'forbidden',
  'not-found': 'notFound',
  'trace-not-found': 'notFound',
  conflict: 'conflict',
  'rate-limited': 'rateLimited',
  'internal-error': 'server',
  'dependency-unavailable': 'unavailable',
  'auth-unavailable': {
    title: 'Sign-in is temporarily unavailable',
    message: "We can't reach the sign-in service. Try again shortly.",
    action: 'retry',
  },
  'fixture-not-found': {
    title: "We couldn't find this match",
    message: 'It may have ended or been removed. Pick a match from the list.',
    action: 'lobby',
  },
  'fixture-template-not-found': {
    title: 'This match is no longer available',
    message: 'Pick another match from the list.',
    action: 'lobby',
  },
  'replay-session-not-found': {
    title: 'This replay has ended',
    message: 'Start a new replay from the list of matches.',
    action: 'lobby',
  },
  'fixture-exists': {
    title: 'This match already exists',
    message: 'Open it from the list of matches instead.',
    action: 'lobby',
  },
  'event-conflict': 'conflict',
  'idempotency-key-reused': {
    title: 'That request clashed with an earlier one',
    message: 'Close this and try again.',
    action: 'retry',
  },
  'state-not-found': {
    title: 'Waiting for kick-off',
    message: "The match hasn't started yet. Stats appear once play begins.",
    action: 'retry',
  },
  'recap-not-ready': {
    title: 'The recap is ready at full time',
    message: 'This page updates by itself when the match ends.',
    action: 'none',
  },
  'replay-capacity': {
    title: 'All replay slots are in use',
    message:
      'Lots of replays are running right now. A slot usually frees up within a minute.',
    action: 'wait',
  },
  'replay-unavailable': {
    title: 'Replay controls are briefly unavailable',
    message: 'Please try again in a moment.',
    action: 'wait',
  },
  'replay-state-conflict': {
    title: "That can't be done right now",
    message: 'The replay may have finished, or it is already doing that.',
    action: 'retry',
  },
  'stream-unavailable': {
    title: 'Live updates are briefly unavailable',
    message: "We'll keep trying. The score and stats catch up once we're back.",
    action: 'wait',
  },
  'overlay-not-found': {
    title: 'That graphic no longer exists',
    message: 'It may have finished or been replaced.',
    action: 'none',
  },
  'overlay-not-on-air': {
    title: 'That graphic is no longer on air',
    message: "There's nothing to take off air.",
    action: 'none',
  },
  'overlay-approval-expired': {
    title: 'That graphic missed its moment',
    message: 'Its moment has passed, so it can no longer go on air.',
    action: 'none',
  },
  'overlay-not-awaiting-approval': {
    title: 'That graphic was already decided',
    message: 'Someone already sent it to air or dropped it. Nothing changed.',
    action: 'none',
  },
  'overlay-revision-stale': {
    title: 'The wording just changed',
    message: 'Check the new version, then decide again.',
    action: 'none',
  },
  'editorial-air-paused': {
    title: 'Graphics are on hold',
    message:
      'Graphics are paused or the emergency stop is on, so nothing can go on air.',
    action: 'none',
  },
  'insight-not-found': {
    title: 'That key moment no longer exists',
    message: 'It may have been removed with its replay.',
    action: 'none',
  },
  'insight-already-published': {
    title: 'This key moment is already on air',
    message: 'Take its graphic off air from the on-air preview instead.',
    action: 'none',
  },
  'invalid-cursor': {
    title: 'The list changed while you were browsing',
    message: 'Try again to see the latest entries.',
    action: 'retry',
  },
  'demo-faults-disabled': {
    title: 'Demo failure scenarios are switched off here',
    message: 'Start the replay without a demo scenario.',
    action: 'none',
  },
  'bff-401': 'sessionExpired',
  'bff-403': {
    title: 'That request was blocked for your security',
    message: 'Reload the page and try again.',
    action: 'reload',
  },
  'bff-404': 'notFound',
  'bff-503': {
    title: 'Sign-in is briefly unavailable',
    message: "You're still signed in. Try again in a moment.",
    action: 'wait',
  },
  'bff-502': 'network',
  network: 'network',
  timeout: 'timeout',
  'invalid-response': 'server',
};

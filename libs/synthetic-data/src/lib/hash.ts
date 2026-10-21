import { canonicalJson, hashText } from '@matchiq/canonical-json';
import type { MatchEvent } from '@matchiq/contracts';

export const hashEvents = (events: readonly MatchEvent[]): string =>
  hashText(canonicalJson(events));

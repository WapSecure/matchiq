'use client';

import { useMemo } from 'react';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { useTemplates } from '@/lib/api/hooks';
import { matchCode, parseSessionId } from '@/lib/match-code';

export type MatchLabel = {
  /** `PEN-MAR · N7R5`, or null until the fixture list has loaded. */
  code: string | null;
  /** The replay number within the match, when the id carries one. */
  replay: number | null;
};

export const templateCode = (template: FixtureTemplateSummary): string =>
  matchCode(
    template.home.shortName,
    template.away.shortName,
    template.eventsHash,
  );

/** Resolves a template or session id to the user-facing match code. */
export function useMatchLabel(id: string): MatchLabel {
  const templates = useTemplates();
  const data = templates.data;
  return useMemo(() => {
    const { templateId, replay } = parseSessionId(id);
    const found = data?.find((t) => t.templateId === templateId);
    return { code: found ? templateCode(found) : null, replay };
  }, [data, id]);
}

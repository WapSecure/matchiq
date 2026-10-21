'use client';

import { useTemplates } from '@/lib/api/hooks';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';

const SESSION_SEPARATOR = '_s';

/**
 * Sessions are fixtures named `<templateId>_s<n>` (ADR-0013). The fixture
 * contract carries no template link yet, so the longest matching template id
 * wins; the result supplies the event count and the restart target.
 */
export const templateOfSession = (
  sessionId: string,
  templates: readonly FixtureTemplateSummary[],
): FixtureTemplateSummary | null =>
  templates
    .filter(
      (t) =>
        sessionId === t.templateId ||
        sessionId.startsWith(`${t.templateId}${SESSION_SEPARATOR}`),
    )
    .sort((a, b) => b.templateId.length - a.templateId.length)[0] ?? null;

export const useSessionTemplate = (
  sessionId: string,
): FixtureTemplateSummary | null => {
  const templates = useTemplates();
  return templates.data ? templateOfSession(sessionId, templates.data) : null;
};

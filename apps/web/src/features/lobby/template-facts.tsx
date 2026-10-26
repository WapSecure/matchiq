'use client';

import { MatchCodeChip } from '@/components/match/match-code-chip';
import { TechnicalDetails } from '@/components/ui';
import { MATCH_CODE_COPY } from '@/constants/match-code';
import { useInterfaceLanguage } from '@/features/interface-language/interface-language-store';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { templateCode } from '@/lib/use-match-label';

function Fact({
  term,
  value,
  wrap = false,
}: {
  term: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-ink-subtle">{term}</dt>
      <dd className={`tabular text-ink ${wrap ? 'break-all' : ''}`}>{value}</dd>
    </div>
  );
}

/** The copyable match code up front; event count, seed and hash are proof for engineers. */
export function TemplateFacts({
  template,
}: {
  template: FixtureTemplateSummary;
}) {
  const locale = useInterfaceLanguage((state) => state.locale);
  const copy = usePageMessages().lobby;
  return (
    <div className="flex flex-col gap-2">
      <MatchCodeChip code={templateCode(template)} />
      <TechnicalDetails>
        <dl className="grid gap-2 font-mono">
          <Fact
            term={copy.events}
            value={template.eventCount.toLocaleString(locale)}
          />
          <Fact
            term={MATCH_CODE_COPY.technical.seed}
            value={String(template.seed)}
          />
          <Fact
            term={MATCH_CODE_COPY.technical.hash}
            value={template.eventsHash}
            wrap
          />
        </dl>
      </TechnicalDetails>
    </div>
  );
}

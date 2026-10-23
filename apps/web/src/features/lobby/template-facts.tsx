import { MatchCodeChip } from '@/components/match/match-code-chip';
import { TechnicalDetails } from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { MATCH_CODE_COPY } from '@/constants/match-code';
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
  return (
    <div className="flex flex-col gap-2">
      <MatchCodeChip code={templateCode(template)} />
      <TechnicalDetails>
        <dl className="grid gap-2 font-mono">
          <Fact
            term={LOBBY_COPY.events}
            value={template.eventCount.toLocaleString('en-GB')}
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

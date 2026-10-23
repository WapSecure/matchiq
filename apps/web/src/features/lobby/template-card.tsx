import { RequirePermission } from '@/components/auth/require-permission';
import { TeamMonogram } from '@/components/match/team-monogram';
import { MatchCodeChip } from '@/components/match/match-code-chip';
import { Badge, Disclosure } from '@/components/ui';
import { FEATURED_LABEL, LOBBY_COPY } from '@/constants/lobby';
import { MATCH_CODE_COPY } from '@/constants/match-code';
import { SIDE_LABELS } from '@/constants/match';
import { WATERMARK } from '@/constants/studio';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { templateCode } from '@/lib/use-match-label';
import { scenarioLabel } from './scenario';
import { SessionStart } from './session-start';

type Team = FixtureTemplateSummary['home'];

function TeamLine({ team, side }: { team: Team; side: 'home' | 'away' }) {
  return (
    <div className="flex items-center gap-3">
      <TeamMonogram shortName={team.shortName} side={side} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-ink">
        {team.name}
      </span>
      <span className="eyebrow">{SIDE_LABELS[side]}</span>
    </div>
  );
}

function Facts({ template }: { template: FixtureTemplateSummary }) {
  const technical = MATCH_CODE_COPY.technical;
  const rows: [string, string][] = [
    [technical.seed, String(template.seed)],
    [technical.hash, template.eventsHash],
  ];
  return (
    <div className="mt-1 flex flex-col gap-2">
      <MatchCodeChip code={templateCode(template)} />
      <p className="text-xs text-ink-muted">
        {LOBBY_COPY.events}:{' '}
        <span className="tabular text-ink">
          {template.eventCount.toLocaleString('en-GB')}
        </span>
      </p>
      <Disclosure title={technical.title}>
        <dl className="grid gap-1 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-micro text-ink-subtle">{label}</dt>
              <dd className="tabular break-all font-mono text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Disclosure>
    </div>
  );
}

type TemplateCardProps = {
  template: FixtureTemplateSummary;
  featured?: boolean;
};

export function TemplateCard({
  template,
  featured = false,
}: TemplateCardProps) {
  const titleId = `${template.templateId}-title`;
  return (
    <article
      aria-labelledby={titleId}
      className={`flex w-full min-w-0 flex-col overflow-hidden rounded-lg border bg-surface shadow-panel transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-float ${featured ? 'border-accent/45 ring-1 ring-accent/20' : 'border-line'}`}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <Badge tone="accent">{scenarioLabel(template.scenario)}</Badge>
        {featured ? <Badge tone="neutral">{FEATURED_LABEL}</Badge> : null}
      </header>
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow truncate">{template.competitionLabel}</p>
            <Badge tone="synthetic">{WATERMARK}</Badge>
          </div>
          <h2
            id={titleId}
            className="mt-1 truncate text-sm font-medium text-ink-muted"
          >
            {template.title}
          </h2>
        </div>
        <TeamLine team={template.home} side="home" />
        <TeamLine team={template.away} side="away" />
        <Facts template={template} />
      </div>
      <footer className="mt-auto border-t border-line bg-surface-raised/50 px-5 py-3">
        <RequirePermission permission="replay:control">
          <SessionStart
            templateId={template.templateId}
            title={template.title}
          />
        </RequirePermission>
      </footer>
    </article>
  );
}

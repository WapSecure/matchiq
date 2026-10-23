import { RequirePermission } from '@/components/auth/require-permission';
import { TeamMonogram } from '@/components/match/team-monogram';
import { Badge, TechnicalDetails } from '@/components/ui';
import {
  FEATURED_LABEL,
  HASH_PREVIEW_CHARS,
  LOBBY_COPY,
} from '@/constants/lobby';
import { SIDE_LABELS } from '@/constants/match';
import { WATERMARK } from '@/constants/studio';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
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

/** The event count up front; seed and hash are reproducibility proof for engineers. */
function Facts({ template }: { template: FixtureTemplateSummary }) {
  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="tabular text-xs text-ink-muted">
        <span className="text-ink-subtle">{LOBBY_COPY.events}: </span>
        {template.eventCount.toLocaleString('en-GB')}
      </p>
      <TechnicalDetails>
        <dl className="grid grid-cols-2 gap-2 font-mono">
          <div className="min-w-0">
            <dt className="text-micro text-ink-subtle">
              {LOBBY_COPY.seedLabel}
            </dt>
            <dd className="tabular text-ink">{template.seed}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-micro text-ink-subtle">{LOBBY_COPY.hash}</dt>
            <dd
              className="tabular truncate text-ink"
              title={template.eventsHash}
            >
              {`${template.eventsHash.slice(0, HASH_PREVIEW_CHARS)}…`}
            </dd>
          </div>
        </dl>
      </TechnicalDetails>
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

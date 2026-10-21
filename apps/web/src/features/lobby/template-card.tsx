import { TeamSwatch } from '@/components/match/team-swatch';
import { Badge } from '@/components/ui';
import {
  FEATURED_LABEL,
  HASH_PREVIEW_CHARS,
  LOBBY_COPY,
} from '@/constants/lobby';
import { WATERMARK } from '@/constants/studio';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { scenarioLabel } from './scenario';
import { SessionStart } from './session-start';

type Team = FixtureTemplateSummary['home'];

function TeamLine({ team, side }: { team: Team; side: 'home' | 'away' }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamSwatch side={side} className="size-3" />
      <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
        {team.name}
      </span>
      <span className="font-mono text-xs text-ink-subtle">
        {team.shortName}
      </span>
    </div>
  );
}

function Facts({ template }: { template: FixtureTemplateSummary }) {
  const rows: [string, string][] = [
    [LOBBY_COPY.seedLabel, String(template.seed)],
    [LOBBY_COPY.events, template.eventCount.toLocaleString('en-GB')],
    [LOBBY_COPY.hash, `${template.eventsHash.slice(0, HASH_PREVIEW_CHARS)}…`],
  ];
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-subtle">{label}</dt>
          <dd className="tabular truncate text-right font-mono text-ink-muted">
            {value}
          </dd>
        </div>
      ))}
    </dl>
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
      className={`flex w-full min-w-0 flex-col rounded-lg border bg-surface transition-colors hover:border-line-strong ${featured ? 'border-accent/40' : 'border-line'}`}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <Badge tone="accent">{scenarioLabel(template.scenario)}</Badge>
        {featured ? <Badge tone="neutral">{FEATURED_LABEL}</Badge> : null}
        <Badge tone="synthetic" className="ml-auto">
          {WATERMARK}
        </Badge>
      </header>
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow truncate">{template.competitionLabel}</p>
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
      <footer className="mt-auto border-t border-line px-5 py-3">
        <SessionStart templateId={template.templateId} title={template.title} />
      </footer>
    </article>
  );
}

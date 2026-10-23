import { RequirePermission } from '@/components/auth/require-permission';
import { Badge } from '@/components/ui';
import { FEATURED_LABEL, LOBBY_COPY } from '@/constants/lobby';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { cn } from '@/lib/cn';
import { MatchHero } from './match-hero';
import { competitionName, scenarioLabel, scenarioPreview } from './scenario';
import { SessionStart } from './session-start';
import { TemplateFacts } from './template-facts';

type TemplateCardProps = {
  template: FixtureTemplateSummary;
  featured?: boolean;
};

export function TemplateCard({
  template,
  featured = false,
}: TemplateCardProps) {
  const titleId = `${template.templateId}-title`;
  const preview = scenarioPreview(template.scenario);
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-panel transition-[border-color,box-shadow] duration-200 hover:shadow-float focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20',
        featured
          ? 'border-accent/45 ring-1 ring-accent/20 hover:border-accent/70'
          : 'border-line hover:border-line-strong',
      )}
    >
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone="accent">{scenarioLabel(template.scenario)}</Badge>
          {featured ? <Badge tone="neutral">{FEATURED_LABEL}</Badge> : null}
        </div>
        <p className="eyebrow hidden min-w-0 truncate text-ink-subtle sm:block">
          {competitionName(template.competitionLabel)}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-5 px-5 py-5">
        <MatchHero template={template} titleId={titleId} />
        {preview ? (
          <p className="rounded-lg border border-line bg-surface-raised/60 px-3 py-2.5 text-sm leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">{LOBBY_COPY.expect}: </span>
            {preview}
          </p>
        ) : null}
        <TemplateFacts template={template} />
      </div>
      <footer className="border-t border-line bg-surface-raised/50 px-5 py-4">
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

'use client';

import { ArrowRightIcon } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { GUIDE_STEPS, type GuideStep } from '@/constants/guide';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import type {
  GuideStepKey,
  PageMessages,
} from '@/features/interface-language/page-messages';
import { ROUTES } from '@/constants/navigation';

function StepItem({
  step,
  message,
  index,
  labels,
}: {
  step: GuideStep;
  message: PageMessages['guide']['steps'][GuideStepKey];
  index: number;
  labels: Pick<PageMessages['guide'], 'doLabel' | 'showsLabel'>;
}) {
  return (
    <li className="flex gap-4 rounded-lg border border-line bg-surface p-4 shadow-panel sm:p-5">
      <span
        aria-hidden
        className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink"
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {message.title}
        </h2>
        <dl className="mt-2 space-y-2 text-sm leading-relaxed">
          <div>
            <dt className="eyebrow text-accent">{labels.doLabel}</dt>
            <dd className="mt-0.5 text-ink">{message.doThis}</dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-subtle">{labels.showsLabel}</dt>
            <dd className="mt-0.5 text-ink-muted">{message.shows}</dd>
          </div>
        </dl>
        {step.link ? (
          <ButtonLink
            href={step.link.href}
            variant="secondary"
            size="sm"
            className="mt-3"
            trailingIcon={<ArrowRightIcon size={14} />}
          >
            {message.link ?? step.link.label}
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}

export function GuidePage() {
  const copy = usePageMessages().guide;
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <header>
        <p className="eyebrow text-accent">{copy.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          {copy.description}
        </p>
      </header>
      <ol aria-label={copy.stepsLabel} className="mt-8 grid gap-3">
        {GUIDE_STEPS.map((step, i) => (
          <StepItem
            key={step.key}
            step={step}
            message={copy.steps[step.key as GuideStepKey]}
            index={i}
            labels={copy}
          />
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-ink-subtle">
        {copy.wording}
      </p>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised p-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {copy.closingTitle}
        </h2>
        <ButtonLink href={ROUTES.fixtures}>{copy.closingAction}</ButtonLink>
      </section>
    </Container>
  );
}

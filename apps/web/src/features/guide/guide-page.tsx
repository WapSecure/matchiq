import { ArrowRightIcon } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { GUIDE_COPY, GUIDE_STEPS, type GuideStep } from '@/constants/guide';
import { ROUTES } from '@/constants/navigation';

function StepItem({ step, index }: { step: GuideStep; index: number }) {
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
          {step.title}
        </h2>
        <dl className="mt-2 space-y-2 text-sm leading-relaxed">
          <div>
            <dt className="eyebrow text-accent">{GUIDE_COPY.doLabel}</dt>
            <dd className="mt-0.5 text-ink">{step.doThis}</dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-subtle">{GUIDE_COPY.showsLabel}</dt>
            <dd className="mt-0.5 text-ink-muted">{step.shows}</dd>
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
            {step.link.label}
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}

export function GuidePage() {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <header>
        <p className="eyebrow text-accent">{GUIDE_COPY.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {GUIDE_COPY.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
          {GUIDE_COPY.description}
        </p>
      </header>
      <ol aria-label={GUIDE_COPY.stepsLabel} className="mt-8 grid gap-3">
        {GUIDE_STEPS.map((step, i) => (
          <StepItem key={step.key} step={step} index={i} />
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-ink-subtle">
        {GUIDE_COPY.wording}
      </p>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised p-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {GUIDE_COPY.closing.title}
        </h2>
        <ButtonLink href={ROUTES.fixtures}>
          {GUIDE_COPY.closing.action}
        </ButtonLink>
      </section>
    </Container>
  );
}

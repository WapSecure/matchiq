'use client';

import { ArrowRightIcon, ShieldIcon } from '@/components/icons';
import { Badge, ButtonLink, Container } from '@/components/ui';
import { HERO } from '@/constants/landing';
import { GUIDE_CTA } from '@/constants/landing-gallery';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { HeroPreview } from './hero-preview';

function HeroFacts({ labels }: { labels: readonly string[] }) {
  return (
    <dl className="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
      {HERO.facts.map((fact, index) => (
        <div
          key={fact.label}
          className="flex flex-col gap-1 bg-surface p-3 sm:p-4"
        >
          <dt className="order-2 text-xs leading-snug text-ink-subtle">
            {labels[index]}
          </dt>
          <dd className="tabular font-mono text-base font-semibold tracking-tight text-ink sm:text-lg">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HeroSection() {
  const copy = usePageMessages().landing.hero;
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-line"
    >
      <Container className="relative grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-24">
        <div className="min-w-0">
          <Badge tone="accent">{copy.eyebrow}</Badge>
          <h1
            id="hero-title"
            className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-5xl xl:text-[3.5rem]"
          >
            {copy.title}
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
            {copy.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={HERO.primaryCta.href}
              trailingIcon={<ArrowRightIcon size={16} />}
            >
              {copy.primaryAction}
            </ButtonLink>
            <ButtonLink href={HERO.howItWorks.href} variant="secondary">
              {copy.secondaryAction}
            </ButtonLink>
            <ButtonLink href={GUIDE_CTA.href} variant="ghost">
              {copy.guideAction}
            </ButtonLink>
          </div>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
            <ShieldIcon size={14} className="mt-px shrink-0 text-synthetic" />
            {copy.disclosure}
          </p>
          <HeroFacts labels={copy.facts} />
        </div>
        <HeroPreview />
      </Container>
    </section>
  );
}

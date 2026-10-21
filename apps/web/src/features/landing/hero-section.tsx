import { ArrowRightIcon, GithubIcon } from '@/components/icons';
import { Badge, ButtonLink, Container } from '@/components/ui';
import { HERO } from '@/constants/landing';
import { SITE } from '@/constants/site';

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-line"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />
      <Container className="relative py-20 sm:py-28">
        <Badge tone="accent">{HERO.eyebrow}</Badge>
        <h1
          id="hero-title"
          className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl"
        >
          {HERO.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          {HERO.description}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <ButtonLink
            href={HERO.primaryCta.href}
            trailingIcon={<ArrowRightIcon size={16} />}
          >
            {HERO.primaryCta.label}
          </ButtonLink>
          <ButtonLink
            href={SITE.repositoryUrl}
            variant="secondary"
            external
            leadingIcon={<GithubIcon size={16} />}
          >
            {HERO.secondaryCta.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

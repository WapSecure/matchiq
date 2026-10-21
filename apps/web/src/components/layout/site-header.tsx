import { GithubIcon, LogoMark } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { HEADER_LABELS, NAV_ITEMS } from '@/constants/navigation';
import { SITE } from '@/constants/site';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-6">
        <a
          href="/"
          aria-label={HEADER_LABELS.homeLink}
          className="flex items-center gap-2.5 text-ink"
        >
          <LogoMark size={22} className="text-accent" />
          <span className="text-sm font-semibold tracking-tight">
            {SITE.name}
          </span>
        </a>
        <nav
          aria-label={HEADER_LABELS.primaryNav}
          className="flex items-center gap-1"
        >
          {NAV_ITEMS.map((item) => (
            <ButtonLink
              key={item.href}
              href={item.href}
              variant="ghost"
              size="sm"
            >
              {item.label}
            </ButtonLink>
          ))}
          <ButtonLink
            href={SITE.repositoryUrl}
            variant="secondary"
            size="sm"
            external
            aria-label={HEADER_LABELS.repository}
            leadingIcon={<GithubIcon size={16} />}
          >
            <span className="hidden sm:inline">GitHub</span>
          </ButtonLink>
        </nav>
      </Container>
    </header>
  );
}

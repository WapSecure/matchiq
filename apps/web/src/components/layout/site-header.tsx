import { UserMenu } from '@/components/auth/user-menu';
import { GithubIcon, LogoMark } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { HEADER_LABELS, NAV_ITEMS } from '@/constants/navigation';
import { SITE } from '@/constants/site';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md backdrop-saturate-150">
      <Container className="flex h-14 items-center justify-between gap-4">
        <a
          href="/"
          aria-label={HEADER_LABELS.homeLink}
          className="flex items-center gap-2.5 rounded-md text-ink"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-ink shadow-panel">
            <LogoMark size={18} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            {SITE.name}
          </span>
        </a>
        <div className="flex items-center gap-2">
          <nav
            aria-label={HEADER_LABELS.primaryNav}
            className="flex items-center gap-0.5"
          >
            {NAV_ITEMS.map((item) => (
              <span
                key={item.href}
                className={item.compact ? 'contents' : 'hidden md:contents'}
              >
                <ButtonLink href={item.href} variant="ghost" size="sm">
                  {item.label}
                </ButtonLink>
              </span>
            ))}
            <span className="hidden sm:contents">
              <ButtonLink
                href={SITE.repositoryUrl}
                variant="ghost"
                size="sm"
                external
                aria-label={HEADER_LABELS.repository}
                leadingIcon={<GithubIcon size={16} />}
              >
                <span className="hidden lg:inline">GitHub</span>
              </ButtonLink>
            </span>
          </nav>
          <span aria-hidden className="h-5 w-px bg-line" />
          <ThemeToggle />
          <UserMenu />
        </div>
      </Container>
    </header>
  );
}

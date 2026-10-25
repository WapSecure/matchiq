'use client';

import { UserMenu } from '@/components/auth/user-menu';
import { GithubIcon, LogoMark } from '@/components/icons';
import { ButtonLink, Container } from '@/components/ui';
import { ROUTES } from '@/constants/navigation';
import { SITE } from '@/constants/site';
import { InterfaceLanguageSelect } from '@/features/interface-language/interface-language-select';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const messages = useInterfaceMessages();
  const navItems = [
    {
      label: messages.navigation.matches,
      href: ROUTES.fixtures,
      compact: true,
    },
    {
      label: messages.navigation.howItWorks,
      href: '/#pipeline',
      compact: false,
    },
    {
      label: messages.navigation.whyTrustIt,
      href: '/#principles',
      compact: false,
    },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md backdrop-saturate-150">
      <Container className="flex h-14 items-center justify-between gap-4">
        <a
          href="/"
          aria-label={messages.navigation.home}
          className="flex items-center gap-2.5 rounded-md text-ink"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-ink shadow-panel">
            <LogoMark size={18} />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
            {SITE.name}
          </span>
        </a>
        <div className="flex items-center gap-2">
          <nav
            aria-label={messages.navigation.primary}
            className="flex items-center gap-0.5"
          >
            {navItems.map((item) => (
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
                aria-label={messages.navigation.repository}
                leadingIcon={<GithubIcon size={16} />}
              >
                <span className="hidden lg:inline">GitHub</span>
              </ButtonLink>
            </span>
          </nav>
          <span aria-hidden className="h-5 w-px bg-line" />
          <InterfaceLanguageSelect compact />
          <ThemeToggle />
          <UserMenu />
        </div>
      </Container>
    </header>
  );
}

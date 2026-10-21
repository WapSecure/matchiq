export const ROUTES = {
  home: '/',
  fixtures: '/fixtures',
  studio: (fixtureId: string) => `/studio/${encodeURIComponent(fixtureId)}`,
} as const;

/** `compact: false` items are hidden below the `sm` breakpoint. */
export const NAV_ITEMS = [
  { label: 'Fixtures', href: ROUTES.fixtures, compact: true },
  { label: 'Pipeline', href: '/#pipeline', compact: false },
  { label: 'Principles', href: '/#principles', compact: false },
] as const;

export const HEADER_LABELS = {
  primaryNav: 'Primary',
  homeLink: 'MatchIQ home',
  repository: 'GitHub source repository',
} as const;

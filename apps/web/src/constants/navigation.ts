export const ROUTES = {
  home: '/',
  fixtures: '/fixtures',
  studio: (fixtureId: string) => `/studio/${encodeURIComponent(fixtureId)}`,
  recap: (fixtureId: string) =>
    `/studio/${encodeURIComponent(fixtureId)}/recap`,
  observatory: (fixtureId: string) =>
    `/studio/${encodeURIComponent(fixtureId)}/observatory`,
} as const;

export type StudioView = 'live' | 'recap' | 'observatory';

export const STUDIO_TABS: readonly {
  view: StudioView;
  label: string;
  href: (fixtureId: string) => string;
}[] = [
  { view: 'live', label: 'Live studio', href: ROUTES.studio },
  { view: 'recap', label: 'Recap', href: ROUTES.recap },
  { view: 'observatory', label: 'Agent observatory', href: ROUTES.observatory },
];

export const STUDIO_TABS_LABEL = 'Session views';

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

export const ROUTES = {
  home: '/',
  fixtures: '/fixtures',
  studio: (fixtureId: string) => `/studio/${encodeURIComponent(fixtureId)}`,
  recap: (fixtureId: string) =>
    `/studio/${encodeURIComponent(fixtureId)}/recap`,
  observatory: (fixtureId: string) =>
    `/studio/${encodeURIComponent(fixtureId)}/observatory`,
  audit: (fixtureId: string) =>
    `/studio/${encodeURIComponent(fixtureId)}/audit`,
} as const;

export type StudioView = 'live' | 'recap' | 'observatory' | 'audit';

export const STUDIO_TABS: readonly {
  view: StudioView;
  label: string;
  href: (fixtureId: string) => string;
}[] = [
  { view: 'live', label: 'Live studio', href: ROUTES.studio },
  { view: 'recap', label: 'Recap', href: ROUTES.recap },
  { view: 'observatory', label: 'AI fact-checks', href: ROUTES.observatory },
  { view: 'audit', label: 'Activity log', href: ROUTES.audit },
];

export const STUDIO_TABS_LABEL = 'Match views';

/** `compact: false` items are hidden below the `sm` breakpoint. */
export const NAV_ITEMS = [
  { label: 'Matches', href: ROUTES.fixtures, compact: true },
  { label: 'How it works', href: '/#pipeline', compact: false },
  { label: 'Why trust it', href: '/#principles', compact: false },
] as const;

export const HEADER_LABELS = {
  primaryNav: 'Primary',
  homeLink: 'MatchIQ home',
  repository: 'GitHub source repository',
} as const;

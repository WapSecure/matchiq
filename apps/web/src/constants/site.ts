export const SITE = {
  name: 'MatchIQ',
  title: 'MatchIQ | Football intelligence for live broadcast',
  description:
    'Match analytics, traceable commentary and editorial controls for football broadcast workflows.',
  repositoryUrl: 'https://github.com/WapSecure/matchiq',
  locale: 'en-GB',
} as const;

export const SYNTHETIC_DISCLOSURE = {
  label: 'Synthetic match data',
  text: 'All teams, players and events are fictional and generated for demonstration. MatchIQ is not affiliated with or endorsed by the Premier League.',
} as const;

export const SKIP_LINK_LABEL = 'Skip to content';
export const MAIN_CONTENT_ID = 'main-content';

export const NOT_FOUND_COPY = {
  metaTitle: 'Page not found',
  eyebrow: '404',
  title: 'This page does not exist',
  description:
    'The link may be out of date, or the fixture may have been removed. Pick a synthetic fixture to continue.',
  action: 'Browse fixtures',
  href: '/fixtures',
} as const;

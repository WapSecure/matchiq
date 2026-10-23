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
  eyebrow: 'Page not found',
  title: "This page doesn't exist",
  description:
    'The link may be out of date, or the match may have ended. Pick a match to carry on.',
  action: 'Go to matches',
  href: '/fixtures',
} as const;

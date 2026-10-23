export const SITE = {
  name: 'MatchIQ',
  title: 'MatchIQ | Football intelligence for live broadcast',
  description:
    'Live football intelligence for broadcast: match stats, AI-written key moments checked against the data, and on-air graphics in four languages.',
  repositoryUrl: 'https://github.com/WapSecure/matchiq',
  locale: 'en-GB',
} as const;

export const SYNTHETIC_DISCLOSURE = {
  label: 'Simulated match data',
  text: 'All teams, players and events are fictional and made up for this demo. MatchIQ is not affiliated with or endorsed by the Premier League.',
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

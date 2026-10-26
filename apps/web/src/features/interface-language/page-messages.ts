import type { AnyRole } from '@matchiq/access';
import type { ReplaySpeed, ReplayState } from '@matchiq/contracts';
import enRaw from './page-messages/en-GB.json';
import esRaw from './page-messages/es-ES.json';
import frRaw from './page-messages/fr-FR.json';
import type { InterfaceLocale } from './interface-locales';

export type LandingStageKey =
  'ingest' | 'interpret' | 'explain' | 'render' | 'personalize';
export type PrincipleKey = 'evidence' | 'repeatable' | 'resilience';
export type GuideStepKey =
  | 'start'
  | 'watch'
  | 'evidence'
  | 'audience'
  | 'listen'
  | 'factchecks'
  | 'producer'
  | 'recap';

type TitledDescription = { title: string; description: string };
type GuideStepMessage = {
  title: string;
  doThis: string;
  shows: string;
  link?: string;
};

export type PageMessages = {
  landing: {
    hero: {
      eyebrow: string;
      title: string;
      description: string;
      primaryAction: string;
      secondaryAction: string;
      guideAction: string;
      disclosure: string;
      facts: readonly string[];
    };
    pipeline: {
      eyebrow: string;
      title: string;
      description: string;
      stages: Record<LandingStageKey, TitledDescription>;
    };
    principles: {
      eyebrow: string;
      title: string;
      items: Record<PrincipleKey, TitledDescription>;
    };
  };
  guide: {
    eyebrow: string;
    title: string;
    description: string;
    stepsLabel: string;
    doLabel: string;
    showsLabel: string;
    wording: string;
    closingTitle: string;
    closingAction: string;
    steps: Record<GuideStepKey, GuideStepMessage>;
  };
  offline: {
    eyebrow: string;
    title: string;
    description: string;
    retry: string;
  };
  auth: {
    title: string;
    lead: string;
    unavailable: string;
    continue: string;
    publicDemo: string;
    demoTitle: string;
    demoBadge: string;
    demoLead: (password: string) => string;
    demoAccount: (role: string, organisation: string) => string;
    roles: Record<AnyRole, string>;
    errors: Record<'callback' | 'unavailable' | 'expired', string>;
  };
  lobby: {
    eyebrow: string;
    title: string;
    description: string;
    guide: string;
    howItWorks: { label: string; text: string };
    listLabel: string;
    pagesLabel: string;
    events: string;
    versus: string;
    home: string;
    away: string;
    expect: string;
    featured: string;
    start: string;
    startLabel: (title: string) => string;
    starting: string;
    speedLabel: string;
    speedFor: (title: string) => string;
    speeds: Record<ReplaySpeed, { label: string; description: string }>;
    startFailed: string;
    rateLimited: string;
    loading: string;
    empty: TitledDescription;
    error: string;
    regions: { matches: string; replays: string };
    nouns: {
      matches: { one: string; other: string };
      replays: { one: string; other: string };
    };
    scenarioLabels: Record<string, string>;
    scenarioPreviews: Record<string, string>;
    sessions: {
      title: string;
      description: string;
      listLabel: string;
      pagesLabel: string;
      empty: string;
      error: string;
      loading: string;
      open: string;
      openLabel: (title: string, number: number) => string;
      replay: (number: number) => string;
      notStarted: string;
      live: string;
      finished: string;
      state: Record<ReplayState, string>;
    };
  };
};

type StaticAuth = Omit<PageMessages['auth'], 'demoLead' | 'demoAccount'>;
type StaticSessions = Omit<
  PageMessages['lobby']['sessions'],
  'openLabel' | 'replay'
>;
type StaticLobby = Omit<
  PageMessages['lobby'],
  'startLabel' | 'speedFor' | 'sessions'
> & { sessions: StaticSessions };
type StaticPageMessages = Omit<PageMessages, 'auth' | 'lobby'> & {
  auth: StaticAuth;
  lobby: StaticLobby;
};

type MessageFunctions = Pick<PageMessages['auth'], 'demoLead' | 'demoAccount'> &
  Pick<PageMessages['lobby'], 'startLabel' | 'speedFor'> &
  Pick<PageMessages['lobby']['sessions'], 'openLabel' | 'replay'>;

const withFunctions = (
  messages: StaticPageMessages,
  functions: MessageFunctions,
): PageMessages => ({
  ...messages,
  auth: {
    ...messages.auth,
    demoLead: functions.demoLead,
    demoAccount: functions.demoAccount,
  },
  lobby: {
    ...messages.lobby,
    startLabel: functions.startLabel,
    speedFor: functions.speedFor,
    sessions: {
      ...messages.lobby.sessions,
      openLabel: functions.openLabel,
      replay: functions.replay,
    },
  },
});

const en = withFunctions(enRaw, {
  demoLead: (password) =>
    `Try MatchIQ as each role. Choose an account, then sign in with the password ${password}.`,
  demoAccount: (role, organisation) => `${role} · ${organisation}`,
  startLabel: (title) => `Start replay of ${title}`,
  speedFor: (title) => `Replay speed for ${title}`,
  openLabel: (title, number) => `Open replay ${number} of ${title}`,
  replay: (number) => `Replay ${number}`,
});

const fr = withFunctions(frRaw, {
  demoLead: (password) =>
    `Essayez MatchIQ avec chaque rôle. Choisissez un compte, puis connectez-vous avec le mot de passe ${password}.`,
  demoAccount: (role, organisation) => `${role} · ${organisation}`,
  startLabel: (title) => `Lancer la rediffusion de ${title}`,
  speedFor: (title) => `Vitesse de rediffusion pour ${title}`,
  openLabel: (title, number) => `Ouvrir la rediffusion ${number} de ${title}`,
  replay: (number) => `Rediffusion ${number}`,
});

const es = withFunctions(esRaw, {
  demoLead: (password) =>
    `Prueba MatchIQ con cada rol. Elige una cuenta e inicia sesión con la contraseña ${password}.`,
  demoAccount: (role, organisation) => `${role} · ${organisation}`,
  startLabel: (title) => `Iniciar repetición de ${title}`,
  speedFor: (title) => `Velocidad de repetición de ${title}`,
  openLabel: (title, number) => `Abrir repetición ${number} de ${title}`,
  replay: (number) => `Repetición ${number}`,
});

export const PAGE_MESSAGES: Record<InterfaceLocale, PageMessages> = {
  'en-GB': en,
  'fr-FR': fr,
  'es-ES': es,
};

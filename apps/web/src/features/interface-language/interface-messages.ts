export type InterfaceMessages = {
  language: { label: string; saved: string };
  navigation: {
    primary: string;
    home: string;
    repository: string;
    matches: string;
    howItWorks: string;
    whyTrustIt: string;
    back: string;
    skipToContent: string;
  };
  synthetic: { label: string; watermark: string; text: string };
  theme: {
    legend: string;
    light: string;
    dark: string;
    system: string;
    cycle: (current: string, next: string) => string;
  };
  account: {
    menu: string;
    signIn: string;
    signOut: string;
    signedInAs: string;
    organisation: string;
    organisationUnavailable: string;
    role: string;
    expired: string;
    signInAgain: string;
  };
  studio: {
    backToMatches: string;
    title: string;
    views: string;
    tabs: Record<'live' | 'recap' | 'observatory' | 'audit', string>;
  };
  audience: {
    persona: string;
    commentaryLanguage: string;
    invariant: string;
    personas: Record<'CASUAL' | 'ANALYST' | 'BROADCAST', string>;
  };
  pwa: {
    updateMessage: string;
    reload: string;
    updateRegion: string;
    installRegion: string;
    installAction: string;
    iosHint: string;
    dismissInstall: string;
  };
};

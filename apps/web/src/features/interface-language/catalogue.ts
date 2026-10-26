import type { InterfaceLocale } from './interface-locales';
import type { InterfaceMessages } from './interface-messages';

export {
  DEFAULT_INTERFACE_LOCALE,
  INTERFACE_LOCALE_OPTIONS,
  isInterfaceLocale,
} from './interface-locales';
export type { InterfaceLocale } from './interface-locales';

const en: InterfaceMessages = {
  language: { label: 'Interface language', saved: 'Saved on this device' },
  navigation: {
    primary: 'Primary',
    home: 'MatchIQ home',
    repository: 'GitHub source repository',
    matches: 'Matches',
    tour: 'Tour',
    howItWorks: 'How it works',
    whyTrustIt: 'Why trust it',
    back: 'Back',
    skipToContent: 'Skip to content',
  },
  synthetic: {
    label: 'Simulated match data',
    watermark: 'Simulated match',
    text: 'All teams, players and events are fictional and made up for this demo. MatchIQ is not affiliated with or endorsed by the Premier League.',
  },
  theme: {
    legend: 'Colour theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    cycle: (current: string, next: string) =>
      `Colour theme: ${current}. Switch to ${next}`,
  },
  account: {
    menu: 'Account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signedInAs: 'Signed in as',
    organisation: 'Organisation',
    organisationUnavailable: 'Organisation name unavailable',
    role: 'Role',
    expired:
      "You've been signed out for security. Sign in again to carry on where you left off.",
    signInAgain: 'Sign in again',
  },
  studio: {
    backToMatches: 'Matches',
    title: 'Live studio',
    views: 'Match views',
    tabs: {
      live: 'Live studio',
      recap: 'Recap',
      observatory: 'Fact-checks',
      audit: 'Activity log',
    },
  },
  audience: {
    persona: 'Audience',
    commentaryLanguage: 'Commentary language',
    invariant:
      'Commentary language changes commentary and graphics. Interface language changes controls and navigation.',
    personas: { CASUAL: 'Fan', ANALYST: 'Analyst', BROADCAST: 'Broadcast' },
  },
  pwa: {
    updateMessage: 'A new version is ready',
    reload: 'Reload',
    updateRegion: 'App update',
    installRegion: 'Install MatchIQ',
    installAction: 'Install app',
    iosHint: 'Install MatchIQ: tap Share, then Add to Home Screen.',
    dismissInstall: 'Dismiss install suggestion',
  },
};

const fr: InterfaceMessages = {
  language: {
    label: "Langue de l'interface",
    saved: 'Enregistrée sur cet appareil',
  },
  navigation: {
    primary: 'Navigation principale',
    home: 'Accueil MatchIQ',
    repository: 'Dépôt source GitHub',
    matches: 'Matchs',
    tour: 'Visite',
    howItWorks: 'Fonctionnement',
    whyTrustIt: 'Pourquoi nous faire confiance',
    back: 'Retour',
    skipToContent: 'Aller au contenu',
  },
  synthetic: {
    label: 'Données de match simulées',
    watermark: 'Match simulé',
    text: "Toutes les équipes, tous les joueurs et tous les événements sont fictifs et ont été créés pour cette démonstration. MatchIQ n'est ni affilié à la Premier League, ni approuvé par celle-ci.",
  },
  theme: {
    legend: 'Thème de couleur',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
    cycle: (current, next) => `Thème de couleur : ${current}. Passer à ${next}`,
  },
  account: {
    menu: 'Compte',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    signedInAs: 'Connecté en tant que',
    organisation: 'Organisation',
    organisationUnavailable: "Nom de l'organisation indisponible",
    role: 'Rôle',
    expired:
      'Vous avez été déconnecté pour des raisons de sécurité. Reconnectez-vous pour reprendre là où vous vous étiez arrêté.',
    signInAgain: 'Se reconnecter',
  },
  studio: {
    backToMatches: 'Matchs',
    title: 'Studio en direct',
    views: 'Vues du match',
    tabs: {
      live: 'Studio en direct',
      recap: 'Récapitulatif',
      observatory: 'Vérifications',
      audit: "Journal d'activité",
    },
  },
  audience: {
    persona: 'Public',
    commentaryLanguage: 'Langue des commentaires',
    invariant:
      "La langue des commentaires modifie les commentaires et les graphiques. La langue de l'interface modifie les commandes et la navigation.",
    personas: {
      CASUAL: 'Supporter',
      ANALYST: 'Analyste',
      BROADCAST: 'Diffusion',
    },
  },
  pwa: {
    updateMessage: 'Une nouvelle version est disponible',
    reload: 'Recharger',
    updateRegion: "Mise à jour de l'application",
    installRegion: 'Installer MatchIQ',
    installAction: "Installer l'application",
    iosHint:
      "Pour installer MatchIQ, touchez Partager, puis Sur l'écran d'accueil.",
    dismissInstall: "Fermer la suggestion d'installation",
  },
};

const es: InterfaceMessages = {
  language: {
    label: 'Idioma de la interfaz',
    saved: 'Guardado en este dispositivo',
  },
  navigation: {
    primary: 'Navegación principal',
    home: 'Inicio de MatchIQ',
    repository: 'Repositorio de código en GitHub',
    matches: 'Partidos',
    tour: 'Recorrido',
    howItWorks: 'Cómo funciona',
    whyTrustIt: 'Por qué confiar',
    back: 'Volver',
    skipToContent: 'Saltar al contenido',
  },
  synthetic: {
    label: 'Datos de partido simulados',
    watermark: 'Partido simulado',
    text: 'Todos los equipos, jugadores y eventos son ficticios y se crearon para esta demostración. MatchIQ no está afiliado ni respaldado por la Premier League.',
  },
  theme: {
    legend: 'Tema de color',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
    cycle: (current, next) => `Tema de color: ${current}. Cambiar a ${next}`,
  },
  account: {
    menu: 'Cuenta',
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    signedInAs: 'Sesión iniciada como',
    organisation: 'Organización',
    organisationUnavailable: 'Nombre de la organización no disponible',
    role: 'Rol',
    expired:
      'Tu sesión se ha cerrado por seguridad. Vuelve a iniciarla para continuar donde la dejaste.',
    signInAgain: 'Volver a iniciar sesión',
  },
  studio: {
    backToMatches: 'Partidos',
    title: 'Estudio en directo',
    views: 'Vistas del partido',
    tabs: {
      live: 'Estudio en directo',
      recap: 'Resumen',
      observatory: 'Verificaciones',
      audit: 'Registro de actividad',
    },
  },
  audience: {
    persona: 'Público',
    commentaryLanguage: 'Idioma de los comentarios',
    invariant:
      'El idioma de los comentarios cambia los comentarios y gráficos. El idioma de la interfaz cambia los controles y la navegación.',
    personas: {
      CASUAL: 'Afición',
      ANALYST: 'Analista',
      BROADCAST: 'Emisión',
    },
  },
  pwa: {
    updateMessage: 'Hay una nueva versión disponible',
    reload: 'Recargar',
    updateRegion: 'Actualización de la aplicación',
    installRegion: 'Instalar MatchIQ',
    installAction: 'Instalar aplicación',
    iosHint:
      'Para instalar MatchIQ, toca Compartir y luego Añadir a pantalla de inicio.',
    dismissInstall: 'Cerrar la sugerencia de instalación',
  },
};

export const INTERFACE_MESSAGES: Record<InterfaceLocale, InterfaceMessages> = {
  'en-GB': en,
  'fr-FR': fr,
  'es-ES': es,
};

import type { CountNoun } from '@/constants/pagination';
import { ERROR_INTERFACE_MESSAGES } from './error-catalogue';
import type { InterfaceLocale } from './interface-locales';
import type { InterfaceMessages } from './interface-messages';
import { REGION_INTERFACE_MESSAGES } from './region-catalogue';

type SharedMessages = Pick<
  InterfaceMessages,
  'feedback' | 'pagination' | 'technical'
>;

const number = (locale: InterfaceLocale, value: number) =>
  value.toLocaleString(locale);

const translatedNouns: Partial<
  Record<InterfaceLocale, Record<string, CountNoun>>
> = {
  'fr-FR': {
    matches: { one: 'match', other: 'matchs' },
    replays: { one: 'rediffusion', other: 'rediffusions' },
    entries: { one: 'entrée', other: 'entrées' },
    'key moments': { one: 'moment clé', other: 'moments clés' },
  },
  'es-ES': {
    matches: { one: 'partido', other: 'partidos' },
    replays: { one: 'repetición', other: 'repeticiones' },
    entries: { one: 'entrada', other: 'entradas' },
    'key moments': { one: 'momento clave', other: 'momentos clave' },
  },
};

const noun = (locale: InterfaceLocale, count: number, value: CountNoun) => {
  const translated = translatedNouns[locale]?.[value.other] ?? value;
  return count === 1 ? translated.one : translated.other;
};

const en: SharedMessages = {
  feedback: {
    errors: ERROR_INTERFACE_MESSAGES['en-GB'],
    recovery: {
      retry: 'Try again',
      retryIn: (seconds) => `Try again in ${seconds} s`,
      waitFor: (seconds) => `Please wait ${seconds} s`,
      signIn: 'Sign in again',
      lobby: 'Go to matches',
      reload: 'Reload page',
    },
    support: {
      instruction: 'Contact support and quote this reference.',
      reference: 'Reference',
      copy: 'Copy reference',
      copied: 'Copied',
    },
    boundary: {
      title: (region) => `${region} couldn't load`,
      message:
        'The rest of the page still works. Try again to reload this part.',
      retry: 'Try again',
      regions: REGION_INTERFACE_MESSAGES['en-GB'],
    },
    page: {
      metaTitle: 'Something went wrong',
      eyebrow: 'Something went wrong',
      title: "This page didn't load properly",
      description:
        "It's not you. Try again, or head back to the list of matches. If it keeps happening, contact support and quote the reference below.",
      retry: 'Try again',
      lobby: 'Go to matches',
    },
    accessDenied: {
      title: "You don't have access to this",
      body: (role) =>
        role
          ? `Your ${role} role doesn't include this. Ask your organisation owner if you need access.`
          : "Your role doesn't include this. Ask your organisation owner if you need access.",
      action: 'Go to matches',
    },
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    goToPage: (page) => `Page ${number('en-GB', page)}`,
    pageOf: (page, pages) =>
      `Page ${number('en-GB', page)} of ${number('en-GB', pages)}`,
    page: (page) => `Page ${number('en-GB', page)}`,
    showing: (from, to, total, value) =>
      `Showing ${number('en-GB', from)}–${number('en-GB', to)} of ${number('en-GB', total)} ${noun('en-GB', total, value)}`,
    showingCount: (count, value) =>
      `Showing ${number('en-GB', count)} ${noun('en-GB', count, value)}`,
    showingOf: (count, total, value) =>
      `Showing ${number('en-GB', count)} of ${number('en-GB', total)} ${noun('en-GB', total, value)}`,
    perPage: 'Per page',
    perPageOption: (size) => `${number('en-GB', size)} per page`,
    showMore: 'Show more',
    loadingMore: 'Loading more…',
    end: "You've reached the end.",
  },
  technical: {
    summary: 'Technical details',
    audience: 'for engineers and judges',
  },
};

const fr: SharedMessages = {
  feedback: {
    errors: ERROR_INTERFACE_MESSAGES['fr-FR'],
    recovery: {
      retry: 'Réessayer',
      retryIn: (seconds) => `Réessayer dans ${seconds} s`,
      waitFor: (seconds) => `Patientez ${seconds} s`,
      signIn: 'Se reconnecter',
      lobby: 'Voir les matchs',
      reload: 'Recharger la page',
    },
    support: {
      instruction: "Contactez l'assistance et indiquez cette référence.",
      reference: 'Référence',
      copy: 'Copier la référence',
      copied: 'Copiée',
    },
    boundary: {
      title: (region) => `Impossible de charger cette section : ${region}`,
      message:
        'Le reste de la page fonctionne toujours. Réessayez de charger cette section.',
      retry: 'Réessayer',
      regions: REGION_INTERFACE_MESSAGES['fr-FR'],
    },
    page: {
      metaTitle: 'Un problème est survenu',
      eyebrow: 'Un problème est survenu',
      title: "Cette page ne s'est pas chargée correctement",
      description:
        "Le problème ne vient pas de vous. Réessayez ou revenez à la liste des matchs. S'il persiste, contactez l'assistance et indiquez la référence ci-dessous.",
      retry: 'Réessayer',
      lobby: 'Voir les matchs',
    },
    accessDenied: {
      title: "Vous n'avez pas accès à cette section",
      body: (role) =>
        role
          ? `Le rôle ${role} ne comprend pas cet accès. Demandez-le au responsable de votre organisation si nécessaire.`
          : 'Votre rôle ne comprend pas cet accès. Demandez-le au responsable de votre organisation si nécessaire.',
      action: 'Voir les matchs',
    },
  },
  pagination: {
    previous: 'Précédent',
    next: 'Suivant',
    previousPage: 'Page précédente',
    nextPage: 'Page suivante',
    goToPage: (page) => `Page ${number('fr-FR', page)}`,
    pageOf: (page, pages) =>
      `Page ${number('fr-FR', page)} sur ${number('fr-FR', pages)}`,
    page: (page) => `Page ${number('fr-FR', page)}`,
    showing: (from, to, total, value) =>
      `${number('fr-FR', from)} à ${number('fr-FR', to)} sur ${number('fr-FR', total)} ${noun('fr-FR', total, value)}`,
    showingCount: (count, value) =>
      `${number('fr-FR', count)} ${noun('fr-FR', count, value)} affichés`,
    showingOf: (count, total, value) =>
      `${number('fr-FR', count)} sur ${number('fr-FR', total)} ${noun('fr-FR', total, value)}`,
    perPage: 'Par page',
    perPageOption: (size) => `${number('fr-FR', size)} par page`,
    showMore: 'Afficher plus',
    loadingMore: 'Chargement…',
    end: 'Vous avez atteint la fin.',
  },
  technical: {
    summary: 'Détails techniques',
    audience: 'pour les équipes techniques et les évaluateurs',
  },
};

const es: SharedMessages = {
  feedback: {
    errors: ERROR_INTERFACE_MESSAGES['es-ES'],
    recovery: {
      retry: 'Intentar de nuevo',
      retryIn: (seconds) => `Intentar de nuevo en ${seconds} s`,
      waitFor: (seconds) => `Espera ${seconds} s`,
      signIn: 'Volver a iniciar sesión',
      lobby: 'Ver partidos',
      reload: 'Recargar la página',
    },
    support: {
      instruction: 'Contacta con soporte e indica esta referencia.',
      reference: 'Referencia',
      copy: 'Copiar referencia',
      copied: 'Copiada',
    },
    boundary: {
      title: (region) => `No se pudo cargar esta sección: ${region}`,
      message:
        'El resto de la página sigue funcionando. Intenta cargar esta sección de nuevo.',
      retry: 'Intentar de nuevo',
      regions: REGION_INTERFACE_MESSAGES['es-ES'],
    },
    page: {
      metaTitle: 'Se ha producido un problema',
      eyebrow: 'Se ha producido un problema',
      title: 'Esta página no se ha cargado correctamente',
      description:
        'No es culpa tuya. Inténtalo de nuevo o vuelve a la lista de partidos. Si el problema continúa, contacta con soporte e indica la referencia que aparece abajo.',
      retry: 'Intentar de nuevo',
      lobby: 'Ver partidos',
    },
    accessDenied: {
      title: 'No tienes acceso a esta sección',
      body: (role) =>
        role
          ? `El rol ${role} no incluye este acceso. Pídeselo al responsable de tu organización si lo necesitas.`
          : 'Tu rol no incluye este acceso. Pídeselo al responsable de tu organización si lo necesitas.',
      action: 'Ver partidos',
    },
  },
  pagination: {
    previous: 'Anterior',
    next: 'Siguiente',
    previousPage: 'Página anterior',
    nextPage: 'Página siguiente',
    goToPage: (page) => `Página ${number('es-ES', page)}`,
    pageOf: (page, pages) =>
      `Página ${number('es-ES', page)} de ${number('es-ES', pages)}`,
    page: (page) => `Página ${number('es-ES', page)}`,
    showing: (from, to, total, value) =>
      `Mostrando del ${number('es-ES', from)} al ${number('es-ES', to)} de ${number('es-ES', total)} ${noun('es-ES', total, value)}`,
    showingCount: (count, value) =>
      `Mostrando ${number('es-ES', count)} ${noun('es-ES', count, value)}`,
    showingOf: (count, total, value) =>
      `Mostrando ${number('es-ES', count)} de ${number('es-ES', total)} ${noun('es-ES', total, value)}`,
    perPage: 'Por página',
    perPageOption: (size) => `${number('es-ES', size)} por página`,
    showMore: 'Mostrar más',
    loadingMore: 'Cargando…',
    end: 'Has llegado al final.',
  },
  technical: {
    summary: 'Detalles técnicos',
    audience: 'para equipos técnicos y evaluadores',
  },
};

export const SHARED_INTERFACE_MESSAGES: Record<
  InterfaceLocale,
  SharedMessages
> = {
  'en-GB': en,
  'fr-FR': fr,
  'es-ES': es,
};

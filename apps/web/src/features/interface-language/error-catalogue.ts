import type { InterfaceLocale } from './interface-locales';
import type { InterfaceMessages } from './interface-messages';

type ErrorMessages = InterfaceMessages['feedback']['errors'];

const en: ErrorMessages = {
  offline: {
    title: "You're offline",
    message:
      "Check your internet connection. We'll pick up where you left off when you're back.",
  },
  network: {
    title: "We can't reach MatchIQ right now",
    message:
      'This is usually a brief connection problem. Try again in a moment.',
  },
  timeout: {
    title: 'This is taking longer than usual',
    message: "MatchIQ didn't respond in time. Try again.",
  },
  sessionExpired: {
    title: "You've been signed out for security",
    message: 'Sign in again to carry on where you left off.',
  },
  forbidden: {
    title: "You don't have access to this",
    message:
      "Your role doesn't include this. Ask your organisation owner if you need it.",
  },
  notFound: {
    title: "We couldn't find that",
    message: 'It may have ended or been removed.',
  },
  conflict: {
    title: 'That has already changed',
    message:
      'Something changed while you were working. Try again to see the latest.',
  },
  invalid: {
    title: "That didn't go through",
    message:
      "We couldn't accept that request. Try again, and contact support if it keeps happening.",
  },
  rateLimited: {
    title: "You're going a little fast",
    message: 'Please wait a moment before trying again.',
  },
  unavailable: {
    title: 'MatchIQ is busy right now',
    message: "We're at capacity. Please try again shortly.",
  },
  server: {
    title: 'Something went wrong on our side',
    message:
      "It's not you. Try again, and contact support if it keeps happening.",
  },
  unexpected: {
    title: 'Something went wrong',
    message: 'Try again. If it keeps happening, contact support.',
  },
};

const fr: ErrorMessages = {
  offline: {
    title: 'Vous êtes hors ligne',
    message:
      'Vérifiez votre connexion Internet. Vous pourrez reprendre là où vous vous êtes arrêté une fois reconnecté.',
  },
  network: {
    title: 'MatchIQ est momentanément inaccessible',
    message:
      'Il s’agit généralement d’un bref problème de connexion. Réessayez dans un instant.',
  },
  timeout: {
    title: 'Cela prend plus de temps que prévu',
    message: "MatchIQ n'a pas répondu à temps. Réessayez.",
  },
  sessionExpired: {
    title: 'Vous avez été déconnecté pour des raisons de sécurité',
    message: 'Reconnectez-vous pour reprendre là où vous vous étiez arrêté.',
  },
  forbidden: {
    title: "Vous n'avez pas accès à cette section",
    message:
      'Votre rôle ne comprend pas cet accès. Demandez-le au responsable de votre organisation si nécessaire.',
  },
  notFound: {
    title: 'Élément introuvable',
    message: 'Il a peut-être pris fin ou été supprimé.',
  },
  conflict: {
    title: 'Cet élément a déjà été modifié',
    message:
      'Une modification a eu lieu pendant votre travail. Réessayez pour afficher la dernière version.',
  },
  invalid: {
    title: "La demande n'a pas abouti",
    message:
      "Nous n'avons pas pu accepter cette demande. Réessayez et contactez l'assistance si le problème persiste.",
  },
  rateLimited: {
    title: 'Vos actions sont trop rapprochées',
    message: 'Patientez un instant avant de réessayer.',
  },
  unavailable: {
    title: 'MatchIQ est très sollicité',
    message:
      'La capacité maximale est atteinte. Réessayez dans quelques instants.',
  },
  server: {
    title: 'Un problème est survenu de notre côté',
    message:
      "Le problème ne vient pas de vous. Réessayez et contactez l'assistance s'il persiste.",
  },
  unexpected: {
    title: 'Un problème est survenu',
    message: "Réessayez. Si le problème persiste, contactez l'assistance.",
  },
};

const es: ErrorMessages = {
  offline: {
    title: 'No tienes conexión',
    message:
      'Comprueba tu conexión a Internet. Podrás continuar donde lo dejaste cuando vuelvas a conectarte.',
  },
  network: {
    title: 'No podemos conectar con MatchIQ ahora mismo',
    message:
      'Suele tratarse de un breve problema de conexión. Inténtalo de nuevo en un momento.',
  },
  timeout: {
    title: 'Esto está tardando más de lo habitual',
    message: 'MatchIQ no respondió a tiempo. Inténtalo de nuevo.',
  },
  sessionExpired: {
    title: 'Tu sesión se ha cerrado por seguridad',
    message: 'Vuelve a iniciar sesión para continuar donde lo dejaste.',
  },
  forbidden: {
    title: 'No tienes acceso a esta sección',
    message:
      'Tu rol no incluye este acceso. Pídeselo al responsable de tu organización si lo necesitas.',
  },
  notFound: {
    title: 'No encontramos ese elemento',
    message: 'Puede que haya finalizado o se haya eliminado.',
  },
  conflict: {
    title: 'Ese elemento ya ha cambiado',
    message:
      'Se produjo un cambio mientras trabajabas. Inténtalo de nuevo para ver la última versión.',
  },
  invalid: {
    title: 'La solicitud no se completó',
    message:
      'No pudimos aceptar esa solicitud. Inténtalo de nuevo y contacta con soporte si el problema continúa.',
  },
  rateLimited: {
    title: 'Estás realizando acciones demasiado rápido',
    message: 'Espera un momento antes de intentarlo de nuevo.',
  },
  unavailable: {
    title: 'MatchIQ está muy ocupado ahora mismo',
    message:
      'Hemos alcanzado la capacidad máxima. Inténtalo de nuevo en breve.',
  },
  server: {
    title: 'Se ha producido un problema en nuestro sistema',
    message:
      'No es culpa tuya. Inténtalo de nuevo y contacta con soporte si el problema continúa.',
  },
  unexpected: {
    title: 'Se ha producido un problema',
    message:
      'Inténtalo de nuevo. Si el problema continúa, contacta con soporte.',
  },
};

export const ERROR_INTERFACE_MESSAGES: Record<InterfaceLocale, ErrorMessages> =
  {
    'en-GB': en,
    'fr-FR': fr,
    'es-ES': es,
  };

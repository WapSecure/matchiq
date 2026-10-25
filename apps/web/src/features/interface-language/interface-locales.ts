export const INTERFACE_LOCALES = ['en-GB', 'fr-FR', 'es-ES'] as const;

export type InterfaceLocale = (typeof INTERFACE_LOCALES)[number];

export const DEFAULT_INTERFACE_LOCALE: InterfaceLocale = 'en-GB';

export const INTERFACE_LOCALE_OPTIONS: readonly {
  id: InterfaceLocale;
  label: string;
  short: string;
  lang: InterfaceLocale;
}[] = [
  { id: 'en-GB', label: 'English', short: 'EN', lang: 'en-GB' },
  { id: 'fr-FR', label: 'Français', short: 'FR', lang: 'fr-FR' },
  { id: 'es-ES', label: 'Español', short: 'ES', lang: 'es-ES' },
];

export const isInterfaceLocale = (value: unknown): value is InterfaceLocale =>
  typeof value === 'string' &&
  INTERFACE_LOCALES.includes(value as InterfaceLocale);

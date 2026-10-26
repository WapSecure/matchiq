import { create } from 'zustand';
import {
  DEFAULT_INTERFACE_LOCALE,
  INTERFACE_MESSAGES,
  type InterfaceLocale,
} from './catalogue';

export const INTERFACE_LOCALE_STORAGE_KEY = 'matchiq.interface-locale.v1';

type InterfaceLanguageState = {
  locale: InterfaceLocale;
  setLocale: (locale: InterfaceLocale) => void;
};

export const useInterfaceLanguage = create<InterfaceLanguageState>()((set) => ({
  locale: DEFAULT_INTERFACE_LOCALE,
  setLocale: (locale) => set({ locale }),
}));

export const useInterfaceMessages = () => {
  const locale = useInterfaceLanguage((state) => state.locale);
  return INTERFACE_MESSAGES[locale];
};

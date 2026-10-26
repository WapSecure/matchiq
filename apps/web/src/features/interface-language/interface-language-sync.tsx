'use client';

import { useEffect, useLayoutEffect } from 'react';
import { SITE } from '@/constants/site';
import { isInterfaceLocale } from './catalogue';
import {
  INTERFACE_LOCALE_STORAGE_KEY,
  useInterfaceLanguage,
} from './interface-language-store';

const useBeforePaint =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const readStoredLocale = () => {
  try {
    const value = window.localStorage.getItem(INTERFACE_LOCALE_STORAGE_KEY);
    return isInterfaceLocale(value) ? value : null;
  } catch {
    return null;
  }
};

const applyDocumentLanguage = (locale: string) => {
  document.documentElement.lang = locale;
};

export function InterfaceLanguageSync() {
  const locale = useInterfaceLanguage((state) => state.locale);

  useBeforePaint(() => {
    const stored = readStoredLocale();
    const initial = stored ?? SITE.locale;
    applyDocumentLanguage(initial);
    if (stored) useInterfaceLanguage.setState({ locale: stored });
  }, []);

  useEffect(() => {
    if (locale !== useInterfaceLanguage.getState().locale) return;
    applyDocumentLanguage(locale);
    try {
      window.localStorage.setItem(INTERFACE_LOCALE_STORAGE_KEY, locale);
    } catch {
      return;
    }
  }, [locale]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === INTERFACE_LOCALE_STORAGE_KEY &&
        isInterfaceLocale(event.newValue)
      ) {
        useInterfaceLanguage.setState({ locale: event.newValue });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}

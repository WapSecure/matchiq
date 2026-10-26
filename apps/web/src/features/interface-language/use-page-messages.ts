'use client';

import { useInterfaceLanguage } from './interface-language-store';
import { PAGE_MESSAGES } from './page-messages';

export const usePageMessages = () => {
  const locale = useInterfaceLanguage((state) => state.locale);
  return PAGE_MESSAGES[locale];
};

'use client';

import { Select } from '@/components/ui';
import { INTERFACE_LOCALE_OPTIONS } from './catalogue';
import {
  useInterfaceLanguage,
  useInterfaceMessages,
} from './interface-language-store';

export function InterfaceLanguageSelect({
  compact = false,
}: {
  compact?: boolean;
}) {
  const locale = useInterfaceLanguage((state) => state.locale);
  const setLocale = useInterfaceLanguage((state) => state.setLocale);
  const messages = useInterfaceMessages();

  return (
    <Select
      label={messages.language.label}
      hideLabel
      options={INTERFACE_LOCALE_OPTIONS}
      value={locale}
      onChange={setLocale}
      className={compact ? 'w-[4.5rem] shrink-0' : 'w-full'}
    />
  );
}

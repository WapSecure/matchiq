'use client';

import { MAIN_CONTENT_ID } from '@/constants/site';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';

export function SkipLink() {
  const messages = useInterfaceMessages();
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-ink"
    >
      {messages.navigation.skipToContent}
    </a>
  );
}

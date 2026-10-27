'use client';

import { useEffect } from 'react';
import { PageError } from '@/components/feedback/page-error';
import { SITE } from '@/constants/site';
import {
  useInterfaceLanguage,
  useInterfaceMessages,
} from '@/features/interface-language/interface-language-store';
import './global.css';

const LOG_PREFIX = '[matchiq] app failed:';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Replaces the root layout when it fails. Styles come from the bundled
 * stylesheet (allowed by `style-src 'self'`), never inline `<style>`.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const locale = useInterfaceLanguage((state) => state.locale);
  const messages = useInterfaceMessages();
  useEffect(() => {
    console.error(LOG_PREFIX, error);
  }, [error]);
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <title>{`${messages.feedback.page.metaTitle} · ${SITE.name}`}</title>
        <PageError digest={error.digest} onRetry={reset} />
      </body>
    </html>
  );
}

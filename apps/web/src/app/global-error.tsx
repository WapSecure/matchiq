'use client';

import { useEffect } from 'react';
import { PageError } from '@/components/feedback/page-error';
import { PAGE_ERROR_COPY } from '@/constants/errors';
import { SITE } from '@/constants/site';
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
  useEffect(() => {
    console.error(LOG_PREFIX, error);
  }, [error]);
  return (
    <html lang={SITE.locale}>
      <body className="min-h-dvh">
        <title>{`${PAGE_ERROR_COPY.metaTitle} · ${SITE.name}`}</title>
        <PageError digest={error.digest} onRetry={reset} />
      </body>
    </html>
  );
}

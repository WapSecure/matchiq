'use client';

import { useEffect } from 'react';
import { PageError } from '@/components/feedback/page-error';

const LOG_PREFIX = '[matchiq] page failed:';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Any route segment that throws renders this inside the root layout. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(LOG_PREFIX, error);
  }, [error]);
  return <PageError digest={error.digest} onRetry={reset} />;
}

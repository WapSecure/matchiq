import type { ReactNode } from 'react';
import { SessionExpiredNotice } from '@/components/feedback';
import { SkipLink } from '@/components/layout';
import { QueryProvider } from '@/lib/api/query-provider';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SkipLink />
      <SessionExpiredNotice />
      {children}
    </QueryProvider>
  );
}

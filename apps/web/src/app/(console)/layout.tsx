import type { ReactNode } from 'react';
import { SkipLink } from '@/components/layout';
import { QueryProvider } from '@/lib/api/query-provider';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SkipLink />
      {children}
    </QueryProvider>
  );
}

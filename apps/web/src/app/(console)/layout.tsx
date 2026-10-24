import type { ReactNode } from 'react';
import { SkipLink } from '@/components/layout';
import { PreferencesSync } from '@/features/preferences/preferences-sync';
import { QueryProvider } from '@/lib/api/query-provider';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SkipLink />
      <PreferencesSync />
      {children}
    </QueryProvider>
  );
}

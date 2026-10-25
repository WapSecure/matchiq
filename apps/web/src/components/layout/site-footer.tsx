'use client';

import { LogoMark } from '@/components/icons';
import { Container } from '@/components/ui';
import { SITE } from '@/constants/site';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';

export function SiteFooter() {
  const messages = useInterfaceMessages();
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 text-ink-muted">
          <LogoMark size={18} />
          <span className="text-sm font-medium">{SITE.name}</span>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-ink-subtle">
          {messages.synthetic.text}
        </p>
      </Container>
    </footer>
  );
}

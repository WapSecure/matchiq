import { LogoMark } from '@/components/icons';
import { Container } from '@/components/ui';
import { SITE, SYNTHETIC_DISCLOSURE } from '@/constants/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 text-ink-muted">
          <LogoMark size={18} />
          <span className="text-sm font-medium">{SITE.name}</span>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-ink-subtle">
          {SYNTHETIC_DISCLOSURE.text}
        </p>
      </Container>
    </footer>
  );
}

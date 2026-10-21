import { Badge, Container } from '@/components/ui';
import { SYNTHETIC_DISCLOSURE } from '@/constants/site';

export function SyntheticNotice() {
  return (
    <div role="note" className="border-b border-line bg-surface-sunken">
      <Container className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:gap-3">
        <Badge tone="synthetic" dot>
          {SYNTHETIC_DISCLOSURE.label}
        </Badge>
        <p className="text-xs text-ink-subtle">{SYNTHETIC_DISCLOSURE.text}</p>
      </Container>
    </div>
  );
}

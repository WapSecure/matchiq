'use client';

import { Badge, Container } from '@/components/ui';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';

export function SyntheticNotice() {
  const messages = useInterfaceMessages();
  return (
    <div role="note" className="border-b border-line bg-surface-sunken">
      <Container className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:gap-3">
        <Badge tone="synthetic" dot>
          {messages.synthetic.label}
        </Badge>
        <p className="text-xs text-ink-subtle">{messages.synthetic.text}</p>
      </Container>
    </div>
  );
}

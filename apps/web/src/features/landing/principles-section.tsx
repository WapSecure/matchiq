'use client';

import { Container, FeatureCard, SectionHeader } from '@/components/ui';
import { PRINCIPLES } from '@/constants/landing';
import { usePageMessages } from '@/features/interface-language/use-page-messages';

export function PrinciplesSection() {
  const copy = usePageMessages().landing.principles;
  return (
    <section
      id={PRINCIPLES.id}
      aria-labelledby={`${PRINCIPLES.id}-title`}
      className="scroll-mt-20 border-t border-line bg-surface-sunken py-20"
    >
      <Container>
        <SectionHeader
          id={PRINCIPLES.id}
          eyebrow={copy.eyebrow}
          title={copy.title}
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {PRINCIPLES.items.map((item) => {
            const message = copy.items[item.key];
            return (
              <li key={item.key} className="flex">
                <FeatureCard
                  className="w-full"
                  title={message.title}
                  description={message.description}
                  Icon={item.Icon}
                />
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

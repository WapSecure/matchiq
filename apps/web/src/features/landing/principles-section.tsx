import { Container, FeatureCard, SectionHeader } from '@/components/ui';
import { PRINCIPLES } from '@/constants/landing';

export function PrinciplesSection() {
  return (
    <section
      id={PRINCIPLES.id}
      aria-labelledby={`${PRINCIPLES.id}-title`}
      className="scroll-mt-20 border-t border-line bg-surface-sunken py-20"
    >
      <Container>
        <SectionHeader
          id={PRINCIPLES.id}
          eyebrow={PRINCIPLES.eyebrow}
          title={PRINCIPLES.title}
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {PRINCIPLES.items.map((item) => (
            <li key={item.key} className="flex">
              <FeatureCard
                className="w-full"
                title={item.title}
                description={item.description}
                Icon={item.Icon}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

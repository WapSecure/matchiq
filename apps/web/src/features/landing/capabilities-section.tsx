import { Container, FeatureCard, SectionHeader } from '@/components/ui';
import { CAPABILITIES } from '@/constants/landing-gallery';

export function CapabilitiesSection() {
  return (
    <section
      id={CAPABILITIES.id}
      aria-labelledby={`${CAPABILITIES.id}-title`}
      className="scroll-mt-20 border-t border-line bg-surface-sunken py-20"
    >
      <Container>
        <SectionHeader
          id={CAPABILITIES.id}
          eyebrow={CAPABILITIES.eyebrow}
          title={CAPABILITIES.title}
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.items.map((item) => (
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

import { Container, FeatureCard, SectionHeader } from '@/components/ui';
import { PIPELINE } from '@/constants/landing';

export function PipelineSection() {
  return (
    <section
      id={PIPELINE.id}
      aria-labelledby={`${PIPELINE.id}-title`}
      className="scroll-mt-20 py-20"
    >
      <Container>
        <SectionHeader
          id={PIPELINE.id}
          eyebrow={PIPELINE.eyebrow}
          title={PIPELINE.title}
          description={PIPELINE.description}
        />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.stages.map((stage, i) => (
            <li key={stage.key} className="flex">
              <FeatureCard
                className="w-full"
                index={i + 1}
                title={stage.title}
                description={stage.description}
                Icon={stage.Icon}
              />
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

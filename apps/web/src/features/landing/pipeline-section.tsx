'use client';

import { Container, FeatureCard, SectionHeader } from '@/components/ui';
import { PIPELINE } from '@/constants/landing';
import { usePageMessages } from '@/features/interface-language/use-page-messages';

export function PipelineSection() {
  const copy = usePageMessages().landing.pipeline;
  return (
    <section
      id={PIPELINE.id}
      aria-labelledby={`${PIPELINE.id}-title`}
      className="scroll-mt-20 py-20"
    >
      <Container>
        <SectionHeader
          id={PIPELINE.id}
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.stages.map((stage, i) => {
            const message = copy.stages[stage.key];
            return (
              <li key={stage.key} className="flex">
                <FeatureCard
                  className="w-full"
                  index={i + 1}
                  title={message.title}
                  description={message.description}
                  Icon={stage.Icon}
                />
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
